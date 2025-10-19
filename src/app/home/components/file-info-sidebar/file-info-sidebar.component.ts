import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { DirectoryItem } from '../file-list/model/directory-item.model';
import { HttpClient } from '@angular/common/http';
import { ExplorerStateService } from '../../services/explorer-state.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

type Source = 'live' | 'local';

@Component({
  selector: 'app-file-info-sidebar',
  templateUrl: './file-info-sidebar.component.html',
  styleUrls: ['./file-info-sidebar.component.scss']
})
export class FileInfoSidebarComponent implements OnChanges {
  @Input() item: DirectoryItem | null = null;
  @Output() closed = new EventEmitter<void>();
  // kept for compatibility; not used to open Home modal anymore
  @Output() openModalEvent = new EventEmitter<any>();
  @Output() myRatingChanged = new EventEmitter<number>();

  // LIVE (Civitai) state (sidebar mini view)
  modelVersion: any = null;
  currentImageIndex = 0;
  isLoading = false;
  error: string | null = null;

  // IN-SIDEBAR LOCAL overlay (unchanged)
  dbOverlayOpen = false;
  dbLoading = false;
  dbError: string | null = null;
  dbData: any = null;
  dbImages: Array<{ url: string; width?: number; height?: number; nsfw?: any }> = [];
  dbImageIndex = 0;

  // FULL-SCREEN overlay
  fullOverlayOpen = false;
  fullSource: Source | null = null;
  fullLoading = false;
  fullError: string | null = null;
  fullImageIndex = 0;

  // LIVE raw JSON state
  showLiveRaw = false;
  liveRawJson = '';

  modelJson: any = null;
  showModelRaw = false;
  modelRawJson = '';                 // <-- add this
  modelRawHtml: SafeHtml = '';       // <-- and this
  highlightVersionId: number | null = null;

  showSidebarCarousel = true;
  showFullCarousel = true;

  editingMyRating = false;
  myRatingInput: number | null = null;
  savingMyRating = false;
  myRatingError: string | null = null;

  ten = Array.from({ length: 10 });       // 10 stars
  hoverRating: number | null = null;      // 0..20 while hovering


  // ===== Similar overlay state (top with other fields) =====
  simOverlayOpen = false;
  simAvailableTokens: string[] = [];   // suggestions (single words, de-duped)
  private simSelectedSet = new Set<string>(); // normalized tokens currently selected
  simInput = '';                       // space-separated tokens user sees/edits
  simLoading = false;
  simError: string | null = null;

  // --- editing state ---
  editing = false;
  savingEdit = false;

  // a simple form model; strings for JSON fields
  editForm: any = {
    name: '',
    mainModelName: '',
    category: '',
    localPath: '',
    nsfw: false,
    flag: false,
    urlAccessable: false,

    // JSON-ish strings
    tags: '',
    localTags: '',
    aliases: '',
    triggerWords: '',

    // details
    type: '',
    baseModel: '',
    uploaded: '',        // yyyy-mm-dd
    creatorName: '',
    stats: '',
    hash: '',
    usageTips: '',

    // url
    url: '',

    // description
    description: '',

    // images JSON
    imageUrls: ''
  };

  // sync state
  syncingFromAPI = false;

  simResults: any[] = [];

  // ---- Search Similar filter state ----
  simBaseModels = new Map<string, string>(); // key -> label
  simSelectedBaseModels = new Set<string>();

  // ===== DB Siblings overlay state =====
  sibOverlayOpen = false;
  sibLoading = false;
  sibError: string | null = null;
  sibResults: any[] = [];

  // Base-model filter for siblings
  sibBaseModels = new Map<string, string>();      // key -> label
  sibSelectedBaseModels = new Set<string>();

  // Per-card carousel index (siblings)
  private sibCarouselIndex = new Map<string, number>();

  // --- Live Siblings (modelVersions) state ---
  liveSibOverlayOpen = false;
  liveSibLoading = false;
  liveSibError: string | null = null;
  liveSibResults: any[] = []; // normalized version DTOs (similar shape to DB siblings)

  // Base-model filters
  liveBaseModels = new Map<string, string>();      // key -> label (e.g., "sd 1.5" -> "SD 1.5")
  liveSelectedBaseModels = new Set<string>();

  // Per-card carousel index
  private liveCarouselIndex = new Map<string, number>();


  // only allow sync if we're in local view, have IDs, and are editing
  get canSyncNow(): boolean {
    if (this.fullSource !== 'local') return false;
    if (!this.editing) return false;
    const ids = this.resolveIdsFromItem(this.item);
    return !!ids?.modelID;
  }


  constructor(private http: HttpClient, private explorerState: ExplorerStateService, private sanitizer: DomSanitizer) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['item'] && this.item && !this.item.isDirectory) {
      // seed the rating right away from the card’s data
      const seed = this.readSeedRatingFromItem(this.item);
      if (seed != null) this.seedSavedRating(seed);

      this.error = null;
      this.isLoading = true;

      const ids = this.resolveIdsFromItem(this.item);
      if (ids) {
        this.fetchModelVersion(ids.versionID);
        // (optional) if you want the rest of local fields too:
        // this.fetchLocalRecord();
      } else {
        this.error = 'Unable to resolve model/version IDs from item.';
        this.isLoading = false;
      }
    }
  }


  /** Resolve IDs no matter if item is Virtual, FS+scan, or filename-based. */
  private resolveIdsFromItem(item: any): { modelID: string; versionID: string } | null {
    // Virtual payload (nested under model)
    const v1 = item?.model?.versionNumber;
    const m1 = item?.model?.modelNumber;
    if (v1 && m1) return { modelID: String(m1), versionID: String(v1) };

    // Flattened (if your datasource already lifted them)
    const v2 = item?.versionNumber;
    const m2 = item?.modelNumber;
    if (v2 && m2) return { modelID: String(m2), versionID: String(v2) };

    // FS after scan (stored in scanData)
    const v3 = item?.scanData?.versionNumber;
    const m3 = item?.scanData?.modelNumber;
    if (v3 && m3) return { modelID: String(m3), versionID: String(v3) };

    // Fallback: filename like {modelID}_{versionID}_...
    const name: string | undefined = item?.name;
    if (typeof name === 'string') {
      const m = name.match(/^(\d+)_(\d+)_/);
      if (m) return { modelID: m[1], versionID: m[2] };
    }

    return null;
  }


  // ===== LIVE fetch for sidebar mini view =====
  fetchModelVersion(versionID: string) {
    const url = `https://civitai.com/api/v1/model-versions/${versionID}`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        this.modelVersion = data;
        this.currentImageIndex = 0;
        this.isLoading = false;

        // keep Raw JSON in sync if panel open
        this.refreshLiveRawJson();

        // version we want to highlight in the model JSON
        this.highlightVersionId = Number(this.modelVersion?.id ?? versionID);

        // fetch the model and prepare highlighted HTML
        const modelId = String(this.modelVersion?.modelId ?? this.resolveIdsFromItem(this.item!)?.modelID ?? '');
        if (modelId) this.fetchModelById(modelId);

        // write stats back locally
        this.updateModel({ stats: this.modelVersion?.stats });
      },
      error: (err) => {
        console.error('Error fetching model version data:', err);
        this.error = 'Failed to load model details.';
        this.isLoading = false;
      }
    });
  }

  private refreshLiveRawJson() {
    if (this.showLiveRaw && this.modelVersion) {
      // pretty print with 2-space indent
      this.liveRawJson = JSON.stringify(this.modelVersion, null, 2);
    }
  }

  private renderJsonWithHighlight(value: any, highlightVersionId: number | null): string {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const IND = '  '; // 2-space indent

    const render = (val: any, path: Array<string | number>, depth: number): string => {
      const pad = IND.repeat(depth);

      if (Array.isArray(val)) {
        const items = val.map((v, i) => render(v, path.concat(i), depth + 1));
        return '[\n' + items.map(s => IND.repeat(depth + 1) + s).join(',\n') + '\n' + pad + ']';
      }

      if (val && typeof val === 'object') {
        // We’re inside modelVersions[index] if the second-to-last path segment is 'modelVersions'
        const isInModelVersions = path.length >= 2 && path[path.length - 2] === 'modelVersions';
        const isTarget =
          isInModelVersions && highlightVersionId != null &&
          Number((val as any).id) === Number(highlightVersionId);

        const keys = Object.keys(val);
        const body = keys
          .map((k) => `${IND.repeat(depth + 1)}"${esc(k)}": ${render(val[k], path.concat(k), depth + 1)}`)
          .join(',\n');

        const obj = `{\n${body}\n${pad}}`;
        return isTarget ? `<span class="hl-block">${obj}</span>` : obj;
      }

      if (typeof val === 'string') return `"${esc(val)}"`;
      return esc(String(val));
    };

    return render(value, [], 0);
  }


  toggleLiveRawJson() {
    this.showLiveRaw = !this.showLiveRaw;
    this.refreshLiveRawJson();
  }

  async copyLiveRawJson() {
    try {
      await navigator.clipboard.writeText(this.liveRawJson || '');
      // optional: toast/log
      console.log('Live JSON copied to clipboard');
    } catch (e) {
      console.warn('Clipboard copy failed', e);
    }
  }

  private fetchModelById(modelId: string) {
    if (!modelId) return;
    this.http.get<any>(`https://civitai.com/api/v1/models/${modelId}`).subscribe({
      next: (data) => {
        this.modelJson = data;
        // plain string (for Copy)
        this.modelRawJson = JSON.stringify(this.modelJson, null, 2);
        // highlighted HTML (for display)
        this.modelRawHtml = this.sanitizer.bypassSecurityTrustHtml(
          this.renderJsonWithHighlight(this.modelJson, this.highlightVersionId)
        );
      },
      error: (err) => console.error('Error fetching model data:', err)
    });
  }



  // Same-style toggle & copy as your version block
  toggleModelRaw() {
    this.showModelRaw = !this.showModelRaw;
    this.modelRawJson = this.showModelRaw && this.modelJson
      ? JSON.stringify(this.modelJson, null, 2)
      : '';
  }
  async copyModelRaw() {
    try { await navigator.clipboard.writeText(this.modelRawJson || ''); }
    catch (e) { console.warn('Clipboard copy failed', e); }
  }

  toggleSidebarCarousel() { this.showSidebarCarousel = !this.showSidebarCarousel; }
  toggleFullCarousel() { this.showFullCarousel = !this.showFullCarousel; }

  updateModel(updateFields: { [key: string]: any }): void {
    if (!this.item) return;

    const ids = this.resolveIdsFromItem(this.item);
    if (!ids) return;

    const { modelID: modelId, versionID: versionId } = ids;

    const payload: any = {
      modelId, versionId,
      fieldsToUpdate: Object.keys(updateFields),
      ...updateFields
    };

    const apiUrl = 'http://localhost:3000/api/update-record-by-model-and-version';
    this.http.post(apiUrl, payload).subscribe({
      next: () => {
        if (this.item && updateFields.stats) {
          if (!this.item.scanData) this.item.scanData = {};
          this.item.scanData.stats = JSON.stringify(updateFields.stats);

          const list = this.explorerState.virtualSelectedDirectory
            ? this.explorerState.virtualDirectoryContents
            : this.explorerState.fsDirectoryContents;

          const idx = list.findIndex(i => i.path === this.item!.path);
          if (idx !== -1) {
            const oldScan = list[idx].scanData || {};
            list[idx].scanData = { ...oldScan, stats: JSON.stringify(updateFields.stats) };
          }

        }
      },
      error: (e) => console.error('Error updating model:', e)
    });
  }


  // mini carousel helpers
  get currentImageUrl(): string {
    return this.modelVersion?.images?.length ? this.modelVersion.images[this.currentImageIndex].url : '';
  }
  prevImage() {
    if (!this.modelVersion?.images?.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.modelVersion.images.length) % this.modelVersion.images.length;
  }
  nextImage() {
    if (!this.modelVersion?.images?.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.modelVersion.images.length;
  }

  // ===== IN-SIDEBAR LOCAL overlay controls (unchanged) =====
  openDbOverlay(): void {
    this.dbOverlayOpen = true;
    this.fetchLocalRecord();
  }
  closeDbOverlay(): void {
    this.dbOverlayOpen = false;
  }

  fetchLocalRecord(): void {
    const ids = this.resolveIdsFromItem(this.item);
    if (!ids) {
      this.dbError = 'Unable to resolve model/version IDs from item.';
      this.dbData = null; this.dbImages = []; this.dbLoading = false;
      return;
    }

    this.dbLoading = true;
    this.dbError = null;

    const url = 'http://localhost:3000/api/find-full-record-from-all-tables-by-modelID-and-version';
    const body = { modelID: ids.modelID, versionID: ids.versionID };

    this.http.post<any>(url, body).subscribe({
      next: (res) => {
        if (!res?.success || !res?.payload) {
          this.dbError = 'Model not found in local database.';
          this.dbData = null; this.dbImages = []; this.dbLoading = false;
          return;
        }
        this.dbData = res.payload;
        this.dbImages = this.parseJsonField<any[]>(this.dbData?.images?.imageUrls, []);
        this.dbImageIndex = 0;
        this.dbLoading = false;
      },
      error: (err) => {
        console.error('Local DB fetch failed:', err);
        this.dbError = 'Failed to load from local database.';
        this.dbData = null; this.dbImages = [];
        this.dbLoading = false;
      }
    });
  }


  // ===== FULL-SCREEN overlay logic =====
  openFullOverlay(source: Source, startIndex = 0) {
    this.fullSource = source;
    this.fullOverlayOpen = true;
    this.fullError = null;
    this.fullLoading = false;
    this.fullImageIndex = startIndex;

    if (source === 'local') {
      if (!this.dbData) {
        const ids = this.resolveIdsFromItem(this.item);
        if (!ids) {
          this.fullError = 'Unable to resolve model/version IDs from item.';
          return;
        }
        this.fullLoading = true;
        const url = 'http://localhost:3000/api/find-full-record-from-all-tables-by-modelID-and-version';
        this.http.post<any>(url, { modelID: ids.modelID, versionID: ids.versionID }).subscribe({
          next: (res) => {
            if (!res?.success || !res?.payload) {
              this.fullError = 'Model not found in local database.';
              this.fullLoading = false; return;
            }
            this.dbData = res.payload;
            this.dbImages = this.parseJsonField<any[]>(this.dbData?.images?.imageUrls, []);
            this.fullImageIndex = 0;
            this.fullLoading = false;
          },
          error: (err) => {
            console.error('Local DB fetch failed:', err);
            this.fullError = 'Failed to load from local database.';
            this.fullLoading = false;
          }
        });
      }
    }

    // for LIVE, we already have modelVersion from the sidebar fetch
  }

  closeFullOverlay() { this.fullOverlayOpen = false; }

  get fullImages(): Array<{ url: string }> {
    return this.fullSource === 'local'
      ? (this.dbImages || [])
      : (this.modelVersion?.images || []);
  }
  prevFullImage() {
    const imgs = this.fullImages;
    if (imgs.length) this.fullImageIndex = (this.fullImageIndex - 1 + imgs.length) % imgs.length;
  }
  nextFullImage() {
    const imgs = this.fullImages;
    if (imgs.length) this.fullImageIndex = (this.fullImageIndex + 1) % imgs.length;
  }

  // repurpose existing openModal() so the template stays the same:
  openModal() {
    // open full-screen overlay with LIVE data at the current image index
    this.openFullOverlay('live', this.currentImageIndex);
  }

  // derived getters for local fields
  // model.*
  get dbId(): number | null { return this.dbData?.model?.id ?? null; }
  get dbName(): string { return this.dbData?.model?.name ?? '—'; }
  get dbMainModelName(): string { return this.dbData?.model?.mainModelName ?? '—'; }
  get dbLocalPath(): string { return this.dbData?.model?.localPath ?? '—'; }
  get dbCategory(): string { return this.dbData?.model?.category ?? '—'; }
  get dbVersionNumber(): string { return this.dbData?.model?.versionNumber ?? '—'; }
  get dbModelNumber(): string { return this.dbData?.model?.modelNumber ?? '—'; }
  get dbNSFW(): boolean | null { return this.normalizeBool(this.dbData?.model?.nsfw); }
  get dbFlag(): boolean | null { return this.normalizeBool(this.dbData?.model?.flag); }
  get dbUrlAccessible(): boolean | null { return this.normalizeBool(this.dbData?.model?.urlAccessable); }
  get dbCreatedAt(): string | Date | null { return this.dbData?.model?.createdAt ?? null; }
  get dbUpdatedAt(): string | Date | null { return this.dbData?.model?.updatedAt ?? null; }
  get dbMyRating(): number | null {
    const v = this.dbData?.model?.myRating;
    if (v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }


  // arrays stored as JSON strings
  get dbTags(): string[] { return this.parseJsonField<string[]>(this.dbData?.model?.tags, []) }
  get dbLocalTags(): string[] { return this.parseJsonField<string[]>(this.dbData?.model?.localTags, []) }
  get dbAliases(): string[] { return this.parseJsonField<string[]>(this.dbData?.model?.aliases, []) }
  get dbTriggerWords(): string[] { return this.parseJsonField<string[]>(this.dbData?.model?.triggerWords, []) }

  // details.*
  get dbType(): string { return this.dbData?.details?.type ?? '—'; }
  get dbUploaded(): string { return this.dbData?.details?.uploaded ?? '—'; }
  get dbBaseModelLocal(): string { return this.dbData?.details?.baseModel ?? '—'; }
  get dbHash(): Record<string, string> | null {
    return this.parseJsonField<Record<string, string> | null>(
      this.dbData?.details?.hash,
      null
    );
  }

  get dbStats(): any { return this.parseJsonField<any>(this.dbData?.details?.stats, null); }
  get dbCreator(): string { return this.dbData?.details?.creatorName ?? this.dbData?.model?.creatorName ?? '—'; }
  get dbUsageTips(): string | null { return this.dbData?.details?.usageTips ?? null; }

  // description.*
  get dbDescriptionHtml(): SafeHtml | '' {
    const raw = this.dbData?.description?.description;
    return raw ? this.sanitizer.bypassSecurityTrustHtml(raw) : '';
  }

  // url.*
  get dbUrl(): string | null { return this.dbData?.url?.url ?? null; }

  // images.* already parsed into this.dbImages elsewhere

  // ======== existing helpers (keep yours) ========
  private parseJsonField<T>(input: any, fallback: T): T {
    if (input == null) return fallback;
    if (typeof input !== 'string') return input as T;
    try { return JSON.parse(input) as T; } catch { return fallback; }
  }
  private normalizeBool(v: any): boolean | null {
    if (v === true || v === false) return v;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true') return true;
      if (s === 'false') return false;
    }
    return null;
  }

  // Overlay carousel controls
  prevDbImage() {
    if (this.dbImages.length) {
      this.dbImageIndex = (this.dbImageIndex - 1 + this.dbImages.length) % this.dbImages.length;
    }
  }
  nextDbImage() {
    if (this.dbImages.length) {
      this.dbImageIndex = (this.dbImageIndex + 1) % this.dbImages.length;
    }
  }

  // Prefer the IDs from the clicked item's scanData (what the card shows).
  // If they're missing, gracefully fall back to the existing resolver.
  get linkModelId(): string | null {
    const sd: any = (this.item as any)?.scanData;
    if (sd?.modelNumber != null) return String(sd.modelNumber);
    const ids = this.resolveIdsFromItem(this.item);
    return ids ? String(ids.modelID) : null;
  }

  get linkVersionId(): string | null {
    const sd: any = (this.item as any)?.scanData;
    if (sd?.versionNumber != null) return String(sd.versionNumber);
    const ids = this.resolveIdsFromItem(this.item);
    return ids ? String(ids.versionID) : null;
  }

  /** Start editing on double-click */
  startEditMyRating() {
    this.myRatingError = null;
    this.editingMyRating = true;
    this.myRatingInput = this.dbMyRating ?? 0;
    // give the input a tick to render, then focus it (optional)
    setTimeout(() => {
      const el = document.getElementById('myRatingInput') as HTMLInputElement | null;
      el?.focus();
      el?.select();
    }, 0);
  }

  /** Cancel editing without saving */
  cancelMyRatingEdit() {
    this.editingMyRating = false;
    this.myRatingError = null;
  }

  get savedRating(): number {
    // prefer DB, else immediate seed from the item, else 0
    return this.dbMyRating ?? (this.readSeedRatingFromItem(this.item) ?? 0);
  }

  get effectiveRating(): number {
    return this.hoverRating ?? this.savedRating;
  }


  /** Return 0, 50, or 100 (percent) for star index i based on rating (0..20). */
  starFillPct(i: number): number {
    const r = this.effectiveRating;           // 0..20
    const start = i * 2;                      // star’s 0,2,4,... bucket
    const filled = Math.min(Math.max(r - start, 0), 2); // 0..2
    return (filled / 2) * 100;                // 0, 50, 100
  }

  /** For a11y label like "Rate 9 of 20". */
  starAriaLabel(i: number): string {
    const half = this.starFillPct(i) === 50 ? 1 : (this.starFillPct(i) === 100 ? 2 : 0);
    const upto = i * 2 + half;
    return `Rate ${upto} of 20`;
  }

  /** Compute half (1) or full (2) increment from pointer x within the star. */
  private halfOrFullFromEvent(evt: MouseEvent | TouchEvent, targetEl: HTMLElement): 1 | 2 {
    const rect = targetEl.getBoundingClientRect();
    const clientX = (evt as TouchEvent).changedTouches?.[0]?.clientX ?? (evt as MouseEvent).clientX;
    const relX = clientX - rect.left;
    return relX < rect.width / 2 ? 1 : 2;
  }

  /** Preview (hover) — desktop */
  onStarHover(evt: MouseEvent, i: number) {
    const step = this.halfOrFullFromEvent(evt, evt.currentTarget as HTMLElement);
    this.hoverRating = i * 2 + step; // 0..20
  }

  /** Touch preview (optional, mainly to determine half/full) */
  onStarTouch(evt: TouchEvent, i: number) {
    const step = this.halfOrFullFromEvent(evt, evt.currentTarget as HTMLElement);
    this.hoverRating = i * 2 + step;
  }

  /** Commit click -> save to DB (keeps your existing API endpoint). */
  onStarClick(evt: MouseEvent | TouchEvent, i: number) {
    const el = evt.currentTarget as HTMLElement;
    const step = this.halfOrFullFromEvent(evt as any, el);
    const newVal = i * 2 + step; // 0..20
    this.commitMyRating(newVal);
  }

  private commitMyRating(val: number) {
    this.myRatingError = null;

    // clamp & int
    const rating = Math.max(0, Math.min(20, Math.trunc(val)));

    const ids = this.resolveIdsFromItem(this.item);
    if (!ids) { this.myRatingError = 'Cannot resolve model/version IDs.'; return; }

    this.savingMyRating = true;

    this.http.post<any>('http://localhost:3000/api/update-myrating-by-modelId-and-versionId', {
      modelID: ids.modelID, versionID: ids.versionID, rating
    }).subscribe({
      next: () => {
        // reflect locally
        if (!this.dbData) this.dbData = {};
        if (!this.dbData.model) this.dbData.model = {};
        this.dbData.model.myRating = rating;
        if ((this.item as any)?.scanData) (this.item as any).scanData.myRating = rating;
        this.myRatingChanged.emit(rating);

        this.hoverRating = null;
        this.savingMyRating = false;
      },
      error: (err) => {
        console.error('update myRating failed:', err);
        this.myRatingError = 'Failed to update rating.';
        this.savingMyRating = false;
      }
    });
  }

  // add a tiny helper
  private clamp0_20(v: any): number | null {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(20, Math.trunc(n)));
  }

  private readSeedRatingFromItem(it: any): number | null {
    // try a few likely places, in priority order
    return (
      this.clamp0_20(it?.scanData?.myRating) ??
      this.clamp0_20(it?.model?.myRating) ??
      this.clamp0_20(it?.myRating) ??
      null
    );
  }

  // call this to set a temporary rating before db loads
  private seedSavedRating(n: number) {
    if (!this.dbData) this.dbData = {};
    if (!this.dbData.model) (this.dbData as any).model = {};
    (this.dbData as any).model.myRating = n;
  }

  startEdit() {
    if (!this.dbData) return;

    // model
    this.editForm.name = this.dbData?.model?.name ?? '';
    this.editForm.mainModelName = this.dbData?.model?.mainModelName ?? '';
    this.editForm.category = this.dbData?.model?.category ?? '';
    this.editForm.localPath = this.dbData?.model?.localPath ?? '';
    this.editForm.nsfw = !!this.dbData?.model?.nsfw;
    this.editForm.flag = !!this.dbData?.model?.flag;
    this.editForm.urlAccessable = !!this.dbData?.model?.urlAccessable;

    // JSON fields (use original strings to preserve formatting if present)
    this.editForm.tags = typeof this.dbData?.model?.tags === 'string'
      ? this.dbData.model.tags : (this.dbTags?.length ? JSON.stringify(this.dbTags) : '');
    this.editForm.localTags = typeof this.dbData?.model?.localTags === 'string'
      ? this.dbData.model.localTags : (this.dbLocalTags?.length ? JSON.stringify(this.dbLocalTags) : '');
    this.editForm.aliases = typeof this.dbData?.model?.aliases === 'string'
      ? this.dbData.model.aliases : (this.dbAliases?.length ? JSON.stringify(this.dbAliases) : '');
    this.editForm.triggerWords = typeof this.dbData?.model?.triggerWords === 'string'
      ? this.dbData.model.triggerWords : (this.dbTriggerWords?.length ? JSON.stringify(this.dbTriggerWords) : '');

    // details
    this.editForm.type = this.dbData?.details?.type ?? '';
    this.editForm.baseModel = this.dbData?.details?.baseModel ?? '';
    this.editForm.uploaded = this.dbData?.details?.uploaded ?? '';
    this.editForm.creatorName = this.dbData?.details?.creatorName ?? '';
    this.editForm.stats = typeof this.dbData?.details?.stats === 'string'
      ? this.dbData.details.stats : (this.dbStats ? JSON.stringify(this.dbStats) : '');
    this.editForm.hash = typeof this.dbData?.details?.hash === 'string'
      ? this.dbData.details.hash : (this.dbHash ? JSON.stringify(this.dbHash) : '');
    this.editForm.usageTips = this.dbData?.details?.usageTips ?? '';

    // url
    this.editForm.url = this.dbData?.url?.url ?? '';

    // description
    this.editForm.description = this.dbData?.description?.description ?? '';

    // images
    this.editForm.imageUrls = typeof this.dbData?.images?.imageUrls === 'string'
      ? this.dbData.images.imageUrls : (this.dbImages?.length ? JSON.stringify(this.dbImages) : '');

    this.editing = true;
  }

  cancelEdit() {
    this.editing = false;
    this.savingEdit = false;
  }

  private isBlank(v: any): boolean {
    return v == null || String(v).trim() === '';
  }

  // return undefined to omit from payload if blank; else canonical JSON string
  private jsonOrUndef(label: string, value: string): string | undefined {
    if (this.isBlank(value)) return undefined;
    try {
      const parsed = JSON.parse(value.trim());
      return JSON.stringify(parsed);
    } catch {
      throw new Error(`${label} must be valid JSON (or left empty).`);
    }
  }

  saveEdit() {
    if (!this.dbData) return;

    const ids = this.resolveIdsFromItem(this.item);
    if (!ids) { this.fullError = 'Cannot resolve model/version IDs.'; return; }

    try {
      this.savingEdit = true;

      // JSON normalization (omit if blank)
      const normTags = this.jsonOrUndef('Tags', this.editForm.tags);
      const normLocalTags = this.jsonOrUndef('Local Tags', this.editForm.localTags);
      const normAliases = this.jsonOrUndef('Aliases', this.editForm.aliases);
      const normTrigger = this.jsonOrUndef('Trigger Words', this.editForm.triggerWords);
      const normImageUrls = this.jsonOrUndef('Image URLs', this.editForm.imageUrls);

      // base model payload; include myRating (from DB UI) as part of model
      const modelPayload: any = {
        modelNumber: ids.modelID,
        versionNumber: ids.versionID,
        name: this.editForm.name,
        mainModelName: this.editForm.mainModelName,
        localPath: this.editForm.localPath,
        category: this.editForm.category,
        nsfw: !!this.editForm.nsfw,
        urlAccessable: !!this.editForm.urlAccessable,
        flag: !!this.editForm.flag,
        myRating: this.dbMyRating // include current rating value (0..20 or null)
      };
      if (normTags !== undefined) modelPayload.tags = normTags;
      if (normLocalTags !== undefined) modelPayload.localTags = normLocalTags;
      if (normAliases !== undefined) modelPayload.aliases = normAliases;
      if (normTrigger !== undefined) modelPayload.triggerWords = normTrigger;

      const dto: any = { model: modelPayload };

      // optional sections, only if user provided something
      if (!this.isBlank(this.editForm.description)) {
        dto.description = { description: this.editForm.description };
      }
      if (!this.isBlank(this.editForm.url)) {
        dto.url = { url: this.editForm.url };
      }

      const hasDetails =
        !this.isBlank(this.editForm.type) ||
        !this.isBlank(this.editForm.baseModel) ||
        !this.isBlank(this.editForm.uploaded) ||
        !this.isBlank(this.editForm.creatorName) ||
        !this.isBlank(this.editForm.stats) ||
        !this.isBlank(this.editForm.hash) ||
        !this.isBlank(this.editForm.usageTips);

      if (hasDetails) {
        const details: any = {};
        if (!this.isBlank(this.editForm.type)) details.type = this.editForm.type;
        if (!this.isBlank(this.editForm.baseModel)) details.baseModel = this.editForm.baseModel;
        if (!this.isBlank(this.editForm.uploaded)) details.uploaded = this.editForm.uploaded; // yyyy-mm-dd
        if (!this.isBlank(this.editForm.creatorName)) details.creatorName = this.editForm.creatorName;
        if (!this.isBlank(this.editForm.stats)) details.stats = this.editForm.stats;       // DB column is String
        if (!this.isBlank(this.editForm.hash)) details.hash = this.editForm.hash;         // DB column is String
        if (!this.isBlank(this.editForm.usageTips)) details.usageTips = this.editForm.usageTips;
        dto.details = details;
      }

      if (normImageUrls !== undefined) {
        dto.images = { imageUrls: normImageUrls };
      }

      const apiUrl = 'http://localhost:3000/api/update-full-record-by-modelID-and-version';
      this.http.put<any>(apiUrl, dto).subscribe({
        next: (res) => {
          this.savingEdit = false;
          this.editing = false;

          // Refresh local data shown in overlay (or replace fields from res.payload)
          this.fetchLocalRecord();
        },
        error: (err) => {
          console.error('Save edit failed:', err);
          this.savingEdit = false;
          this.fullError = 'Failed to save changes.';
        }
      });
    } catch (e: any) {
      this.savingEdit = false;
      this.fullError = e?.message || 'Invalid input.';
    }
  }

  private toYYYYMMDD(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }

  private async fetchCivitaiModel(modelId: string): Promise<any> {
    const url = `https://civitai.com/api/v1/models/${modelId}`;
    return await firstValueFrom(this.http.get<any>(url));
  }

  private pickVersion(api: any, wantedVersionId?: string | null): any | null {
    const versions: any[] = Array.isArray(api?.modelVersions) ? api.modelVersions : [];
    if (!versions.length) return null;
    if (wantedVersionId) {
      const exact = versions.find(v => String(v.id) === String(wantedVersionId));
      if (exact) return exact;
    }
    return versions[0];
  }

  /** If versionId is missing, return the first modelVersions[0].id from the API. */
  private async ensureVersionId(modelId: string, currentVersionId?: string | null): Promise<string> {
    if (currentVersionId && String(currentVersionId).trim() !== '') return String(currentVersionId);
    const api = await this.fetchCivitaiModel(modelId);
    const ver = this.pickVersion(api);
    if (!ver?.id) throw new Error('No modelVersions found for this model.');
    return String(ver.id);
  }

  async syncFromAPI() {
    if (!this.item || !this.editing) return;  // require edit mode
    const ids = this.resolveIdsFromItem(this.item);
    if (!ids?.modelID) { this.fullError = 'Model ID not found.'; return; }

    try {
      this.syncingFromAPI = true;
      this.fullError = null;

      // make sure we have a version id
      const versionId = await this.ensureVersionId(ids.modelID, ids.versionID);

      // fetch full model json (contains modelVersions[])
      const api = await this.fetchCivitaiModel(ids.modelID);
      const ver = this.pickVersion(api, versionId);
      if (!ver) throw new Error('No model version found in API response.');

      // Map API -> editForm (don’t auto-save; user reviews then clicks Save)
      // model
      if (Array.isArray(api.tags)) this.editForm.tags = JSON.stringify(api.tags);
      if (typeof api.description === 'string') this.editForm.description = api.description;
      if (typeof api.type === 'string') this.editForm.type = api.type;
      if (typeof api.nsfw === 'boolean') this.editForm.nsfw = api.nsfw;
      const creatorUser = api?.creator?.username;
      if (creatorUser) this.editForm.creatorName = creatorUser;

      // version
      if (Array.isArray(ver.trainedWords)) this.editForm.triggerWords = JSON.stringify(ver.trainedWords);
      if (typeof ver.baseModel === 'string') this.editForm.baseModel = ver.baseModel;
      this.editForm.uploaded = this.toYYYYMMDD(ver.publishedAt);
      if (ver.stats) this.editForm.stats = JSON.stringify(ver.stats);

      // hashes (primary file preferred)
      const files: any[] = Array.isArray(ver.files) ? ver.files : [];
      const primary = files.find(f => f.primary) || files[0];
      if (primary?.hashes) this.editForm.hash = JSON.stringify(primary.hashes);

      // images: map to {url, nsfw, width, height}
      const imgs: any[] = Array.isArray(ver.images) ? ver.images : [];
      const mappedImgs = imgs
        .filter(i => i?.url)
        .map(i => ({
          url: i.url,
          nsfw: typeof i.nsfwLevel === 'number' ? i.nsfwLevel > 1 : false,
          width: typeof i.width === 'number' ? i.width : undefined,
          height: typeof i.height === 'number' ? i.height : undefined
        }));
      if (mappedImgs.length) this.editForm.imageUrls = JSON.stringify(mappedImgs);

      // If not already in edit mode, switch to edit so user can review/Save
      if (!this.editing) this.startEdit(); // prefill from DB
      // but keep the newly synced API values (overwrite the fields we just set)
      this.editing = true; // ensure edit UI visible

      console.log('Synced fields from Civitai API → edit form (review and Save).');
    } catch (e: any) {
      console.error(e);
      this.fullError = e?.message || 'Sync failed.';
    } finally {
      this.syncingFromAPI = false;
    }
  }

  // Open/close
  openSimOverlay() {
    this.simError = null;
    this.simInput = '';
    this.simSelectedSet.clear();
    this.buildSimilarSuggestions();   // fills simAvailableTokens
    this.simOverlayOpen = true;
    this.simBaseModels.clear();
    this.simSelectedBaseModels.clear();
  }
  closeSimOverlay() { this.simOverlayOpen = false; }

  // Suggestions builder
  private buildSimilarSuggestions() {
    const bag: string[] = [];

    // From DB model (JSON strings)
    const dbTags = this.parseJsonField<string[]>(this.dbData?.model?.tags, []);
    const dbTrig = this.parseJsonField<string[]>(this.dbData?.model?.triggerWords, []);

    // From scanData / item
    const scanTags = (this.item as any)?.scanData?.tags ?? [];
    const itemTags = (this.item as any)?.tags ?? [];

    // Main model names
    const mainFromDb = this.dbData?.model?.mainModelName;
    const mainFromScan = (this.item as any)?.scanData?.mainModelName || (this.item as any)?.mainModelName;

    // Collect raw strings
    if (Array.isArray(dbTags)) bag.push(...dbTags);
    if (Array.isArray(dbTrig)) bag.push(...dbTrig);
    if (Array.isArray(scanTags)) bag.push(...scanTags);
    if (Array.isArray(itemTags)) bag.push(...itemTags);
    if (mainFromDb) bag.push(String(mainFromDb));
    if (mainFromScan) bag.push(String(mainFromScan));

    // Tokenize into single words, normalize and de-duplicate
    const tokens = this.deDupePreserveCase(
      bag.flatMap(s => this.tokenizeToWords(String(s)))
    );

    // Sort for stable UI
    this.simAvailableTokens = tokens.sort((a, b) => a.localeCompare(b));
  }

  // Split a string into words (unicode letters/numbers), lower-level punctuation ignored
  private tokenizeToWords(s: string): string[] {
    // prefer Unicode-aware split; fallback for environments without u-flag support
    try {
      return s
        .split(/[^\p{L}\p{N}]+/u)
        .map(t => t.trim())
        .filter(Boolean);
    } catch {
      return s
        .split(/[^A-Za-z0-9]+/)
        .map(t => t.trim())
        .filter(Boolean);
    }
  }

  // De-duplicate while preserving first-seen casing
  private deDupePreserveCase(arr: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of arr) {
      const k = t.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(t);
      }
    }
    return out;
  }

  // Selection state
  isTokenSelected(token: string): boolean {
    return this.simSelectedSet.has(token.toLowerCase());
  }
  toggleToken(token: string) {
    const k = token.toLowerCase();
    if (this.simSelectedSet.has(k)) {
      this.simSelectedSet.delete(k);
    } else {
      this.simSelectedSet.add(k);
    }
    this.reflectSelectionIntoInput();
  }

  // Keep input in sync with selection
  private reflectSelectionIntoInput() {
    const selected = this.simAvailableTokens
      .filter(t => this.simSelectedSet.has(t.toLowerCase()));
    this.simInput = selected.join(' ');
  }

  // When typing manually, update selection to match input
  syncSelectionFromInput() {
    const tokens = this.tokenizeToWords(this.simInput);
    const wanted = new Set(tokens.map(t => t.toLowerCase()));
    this.simSelectedSet.clear();
    // Only select those that exist in suggestions
    for (const t of this.simAvailableTokens) {
      if (wanted.has(t.toLowerCase())) this.simSelectedSet.add(t.toLowerCase());
    }
  }

  // Helpers for template
  get hasAnyInputTokens(): boolean {
    return this.tokenizeToWords(this.simInput).length > 0;
  }

  // Clear
  clearSimilar() {
    this.simInput = '';
    this.simSelectedSet.clear();
    this.simError = null;
  }

  // on submit, set results and log (you already log)
  submitSimilar() {
    const tagsList = this.tokenizeToWords(this.simInput);
    if (!tagsList.length) return;

    this.simLoading = true;
    this.simError = null;

    this.http.post<any>(
      'http://localhost:3000/api/find-list-of-models-dto-from-all-table-by-tagsList-tampermonkey',
      { tagsList }
    ).subscribe({
      next: (res) => {
        const list: any[] = res?.payload?.modelsList ?? [];
        this.simResults = list;

        // per-card carousel state
        this.simCarouselIndex.clear();
        for (const m of list) {
          this.simCarouselIndex.set(this.simKey(m), 0);
        }

        // >>> build Base Model options <<<
        this.simBaseModels.clear();
        for (const m of list) {
          const key = this.canonBaseModel(m?.baseModel);      // e.g. "sdxl", "unknown"
          const label = this.displayBaseModel(m?.baseModel);  // e.g. "SDXL", "Unknown"
          if (!this.simBaseModels.has(key)) {
            this.simBaseModels.set(key, label);
          }
        }

        // select all after building options
        this.selectAllBaseModels();

        this.simLoading = false;
      },
      error: (err) => {
        console.error('searchSimilar failed:', err);
        this.simError = 'Search failed. Please try again.';
        this.simLoading = false;
      }
    });
  }


  // ---- card helpers

  simCardBgStyle(m: any): string {
    const arr = this.simSafeImageArray(m?.imageUrls);
    const url = arr?.[0]?.url || '';
    return url ? `url("${url}")` : 'none';
  }

  private simSafeImageArray(input: any): Array<{ url: string }> {
    if (Array.isArray(input)) return input as any[];
    return this.parseJsonField<any[]>(input, []);
  }

  simGetParsedStats(m: any): any | null {
    return this.parseJsonField<any>(m?.stats, null);
  }

  simGetMyRating(m: any): number {
    const v = m?.myRating;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(20, Math.trunc(n))) : 0;
  }

  // ---------- BaseModel filter helpers ----------
  private canonBaseModel(v: any): string {
    const s = String(v ?? '').trim();
    return s ? s.toLowerCase() : 'unknown';
  }
  private displayBaseModel(v: any): string {
    const s = String(v ?? '').trim();
    return s || 'Unknown';
  }

  isBaseModelSelected(key: string): boolean {
    return this.simSelectedBaseModels.has(key);
  }
  toggleBaseModel(key: string, on: boolean) {
    if (on) this.simSelectedBaseModels.add(key);
    else this.simSelectedBaseModels.delete(key);
  }
  selectAllBaseModels() {
    this.simSelectedBaseModels = new Set(Array.from(this.simBaseModels.keys()));
  }

  clearBaseModels() {
    this.simSelectedBaseModels.clear();
  }

  // For *ngFor options (stable alphabetical order)
  get simBaseModelLabels(): { key: string; label: string }[] {
    return Array.from(this.simBaseModels.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  // ---------- Sort by uploaded DESC ----------
  private uploadedTime(d: any): number {
    if (!d) return 0;
    const t = Date.parse(String(d));
    return Number.isFinite(t) ? t : 0;
  }

  // Use this instead of simResults in the template
  get filteredAndSortedSimResults(): any[] {
    const total = this.simBaseModels.size;
    const selectedCount = this.simSelectedBaseModels.size;

    // If we have options and none are selected, show nothing
    if (total > 0 && selectedCount === 0) return [];

    // Filter only when a strict subset is selected
    const shouldFilter = selectedCount > 0 && selectedCount < total;

    const base = shouldFilter
      ? (this.simResults ?? []).filter(m =>
        this.simSelectedBaseModels.has(this.canonBaseModel(m?.baseModel))
      )
      : (this.simResults ?? []);

    // sort newest uploaded first
    return base.slice().sort(
      (a, b) => this.uploadedTime(b?.uploaded) - this.uploadedTime(a?.uploaded)
    );
  }

  get noBaseModelSelected(): boolean {
    return this.simBaseModels.size > 0 && this.simSelectedBaseModels.size === 0;
  }


  trackByKey(_i: number, opt: { key: string; label: string }) { return opt.key; }

  onBaseModelCheckboxChange(key: string, evt: Event) {
    const checked = (evt.target as HTMLInputElement).checked;
    this.toggleBaseModel(key, checked);
  }

  // --- Similar results: per-card carousel state ---
  private simCarouselIndex = new Map<string, number>();

  private simKey(m: any): string {
    // stable key for a result card
    return `${m?.modelNumber ?? ''}_${m?.versionNumber ?? ''}`;
  }

  private simImages(m: any): Array<{ url: string }> {
    return this.simSafeImageArray(m?.imageUrls);
  }

  simImageCount(m: any): number {
    return this.simImages(m).length;
  }

  simCurrentImage(m: any): string {
    const imgs = this.simImages(m);
    if (!imgs.length) return '';
    const key = this.simKey(m);
    const i = this.simCarouselIndex.get(key) ?? 0;
    const idx = ((i % imgs.length) + imgs.length) % imgs.length;
    return imgs[idx]?.url || '';
  }

  prevSimImage(m: any, evt?: Event) {
    evt?.stopPropagation();
    const key = this.simKey(m);
    const imgs = this.simImages(m);
    if (imgs.length < 2) return;
    const i = this.simCarouselIndex.get(key) ?? 0;
    this.simCarouselIndex.set(key, (i - 1 + imgs.length) % imgs.length);
  }

  nextSimImage(m: any, evt?: Event) {
    evt?.stopPropagation();
    const key = this.simKey(m);
    const imgs = this.simImages(m);
    if (imgs.length < 2) return;
    const i = this.simCarouselIndex.get(key) ?? 0;
    this.simCarouselIndex.set(key, (i + 1) % imgs.length);
  }

  // trackBy for the result cards grid
  simTrackBy = (_: number, m: any) => this.simKey(m);

  revealLocalPath() {
    const p = this.dbLocalPath as unknown as string;
    if (!p || p === '—') return;

    // Try Electron (works if nodeIntegration is enabled in your Electron window)
    try {
      const w: any = window as any;
      const shell = w?.require?.('electron')?.shell;
      if (shell) {
        // openPath returns '' on success, or an error string on failure
        shell.openPath(p).then((err: string) => {
          if (err) {
            // If opening the dir fails (or p is a file), reveal it in Explorer/Finder
            shell.showItemInFolder(p);
          }
        });
        return;
      }
    } catch { /* ignore */ }

    // Fallback for plain browser (often blocked, but harmless):
    try {
      window.open(this.pathToFileUrl(p), '_blank');
    } catch { /* ignore */ }
  }

  pathToFileUrl(p: string): string {
    // Convert local path to a file:// URL (handles Windows)
    let norm = String(p).replace(/\\/g, '/');           // backslashes → slashes
    if (/^[a-zA-Z]:\//.test(norm)) norm = '/' + norm;   // ensure leading slash on Windows: /C:/...
    return 'file://' + encodeURI(norm);
  }

  copyText(text: string | null | undefined) {
    if (!text || text === '—') return;
    navigator.clipboard?.writeText(String(text)).catch(() => { });
  }

  get modelUrl(): string | null {
    const mId = this.modelVersion?.modelId;
    const vId = this.modelVersion?.id;
    if (!mId || !vId) return null;
    return `https://civitai.com/models/${mId}?modelVersionId=${vId}`;
  }

  openSibOverlay() {
    this.sibError = null;
    this.sibResults = [];
    this.sibBaseModels.clear();
    this.sibSelectedBaseModels.clear();
    this.sibCarouselIndex.clear();

    const ids = this.resolveIdsFromItem(this.item);
    if (!ids?.modelID) {
      this.sibError = 'Unable to resolve model ID from item.';
      this.sibOverlayOpen = true; // still open to show error
      return;
    }

    this.sibOverlayOpen = true;
    this.sibLoading = true;

    this.http.post<any>(
      'http://localhost:3000/api/find-list-of-models-dto-from-all-table-by-modelID',
      { modelID: ids.modelID }
    ).subscribe({
      next: (res) => {
        const list: any[] = res?.payload?.modelsList ?? [];
        this.sibResults = list;

        // init carousels
        this.sibCarouselIndex.clear();
        for (const m of list) {
          this.sibCarouselIndex.set(this.simKey(m), 0);
        }

        // build Base Model options
        this.sibBaseModels.clear();
        for (const m of list) {
          const key = this.canonBaseModel(m?.baseModel);
          const label = this.displayBaseModel(m?.baseModel);
          if (!this.sibBaseModels.has(key)) {
            this.sibBaseModels.set(key, label);
          }
        }

        // select all by default
        this.selectAllSibBaseModels();
        this.sibLoading = false;
      },
      error: (err) => {
        console.error('fetch siblings failed:', err);
        this.sibError = 'Failed to load siblings.';
        this.sibLoading = false;
      }
    });
  }

  closeSibOverlay() { this.sibOverlayOpen = false; }

  // ---- Base-model filter helpers (siblings) ----
  isSibBaseModelSelected(key: string): boolean {
    return this.sibSelectedBaseModels.has(key);
  }
  toggleSibBaseModel(key: string, on: boolean) {
    if (on) this.sibSelectedBaseModels.add(key);
    else this.sibSelectedBaseModels.delete(key);
  }
  selectAllSibBaseModels() {
    this.sibSelectedBaseModels = new Set(Array.from(this.sibBaseModels.keys()));
  }
  clearSibBaseModels() {
    this.sibSelectedBaseModels.clear();
  }
  get sibBaseModelLabels(): { key: string; label: string }[] {
    return Array.from(this.sibBaseModels.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
  get sibNoBaseModelSelected(): boolean {
    return this.sibBaseModels.size > 0 && this.sibSelectedBaseModels.size === 0;
  }
  onSibBaseModelCheckboxChange(key: string, evt: Event) {
    const checked = (evt.target as HTMLInputElement).checked;
    this.toggleSibBaseModel(key, checked);
  }

  // ---- Results view for siblings ----
  get filteredAndSortedSibResults(): any[] {
    const total = this.sibBaseModels.size;
    const selected = this.sibSelectedBaseModels.size;
    if (total > 0 && selected === 0) return [];

    const shouldFilter = selected > 0 && selected < total;
    const base = shouldFilter
      ? (this.sibResults ?? []).filter(m =>
        this.sibSelectedBaseModels.has(this.canonBaseModel(m?.baseModel)))
      : (this.sibResults ?? []);

    // newest uploaded first (reuse uploadedTime())
    return base.slice().sort(
      (a, b) => this.uploadedTime(b?.uploaded) - this.uploadedTime(a?.uploaded)
    );
  }

  // ---- Mini carousel (siblings) ----
  sibImageCount(m: any): number {
    return this.simImages(m).length; // reuse simImages()
  }
  sibCurrentImage(m: any): string {
    const imgs = this.simImages(m);
    if (!imgs.length) return '';
    const key = this.simKey(m);
    const i = this.sibCarouselIndex.get(key) ?? 0;
    const idx = ((i % imgs.length) + imgs.length) % imgs.length;
    return imgs[idx]?.url || '';
  }
  prevSibImage(m: any, evt?: Event) {
    evt?.stopPropagation();
    const imgs = this.simImages(m);
    if (imgs.length < 2) return;
    const key = this.simKey(m);
    const i = this.sibCarouselIndex.get(key) ?? 0;
    this.sibCarouselIndex.set(key, (i - 1 + imgs.length) % imgs.length);
  }
  nextSibImage(m: any, evt?: Event) {
    evt?.stopPropagation();
    const imgs = this.simImages(m);
    if (imgs.length < 2) return;
    const key = this.simKey(m);
    const i = this.sibCarouselIndex.get(key) ?? 0;
    this.sibCarouselIndex.set(key, (i + 1) % imgs.length);
  }

  // === Open/Close ===
  openLiveSibOverlay() {
    this.liveSibError = null;
    this.liveSibResults = [];
    this.liveBaseModels.clear();
    this.liveSelectedBaseModels.clear();
    this.liveCarouselIndex.clear();

    // figure out modelId from item or from the already-fetched modelVersion
    const ids = this.resolveIdsFromItem(this.item);
    const modelId = String(
      ids?.modelID ??
      this.modelVersion?.modelId ??
      this.linkModelId ?? ''
    );

    this.liveSibOverlayOpen = true;

    if (!modelId) {
      this.liveSibError = 'Unable to resolve model ID.';
      return;
    }

    this.fetchLiveSiblings(modelId);
  }

  closeLiveSibOverlay() { this.liveSibOverlayOpen = false; }

  // === Fetch from https://civitai.com/api/v1/models/${modelId} ===
  private fetchLiveSiblings(modelId: string) {
    this.liveSibLoading = true;
    this.http.get<any>(`https://civitai.com/api/v1/models/${modelId}`).subscribe({
      next: (api) => {
        // Normalize each version to a DTO compatible with your card grid
        const modelName = api?.name ?? '—';
        const creatorName = api?.creator?.username ?? '—';
        const versions: any[] = Array.isArray(api?.modelVersions) ? api.modelVersions : [];

        const mapped = versions.map(v => {
          // images -> [{url,width,height,nsfw}]
          const imgs = (Array.isArray(v?.images) ? v.images : [])
            .filter((i: { url: any; }) => i?.url)
            .map((i: { url: any; nsfwLevel: number; width: any; height: any; }) => ({
              url: i.url,
              nsfw: typeof i.nsfwLevel === 'number' ? i.nsfwLevel > 1 : false,
              width: typeof i.width === 'number' ? i.width : undefined,
              height: typeof i.height === 'number' ? i.height : undefined
            }));

          const stats = v?.stats ? JSON.stringify(v.stats) : null;

          return {
            // match your DB siblings DTO keys so existing helpers/CSS work
            modelNumber: String(api?.id ?? modelId),
            versionNumber: String(v?.id ?? ''),
            mainModelName: modelName,      // the model name on the card (as requested)
            creatorName,                   // from top-level creator.username
            baseModel: v?.baseModel ?? '',
            uploaded: v?.publishedAt ?? v?.createdAt ?? null,
            stats,                         // JSON string for simGetParsedStats()
            imageUrls: JSON.stringify(imgs) // JSON string so simSafeImageArray() works
          };
        });

        // init results + carousels
        this.liveSibResults = mapped;
        this.liveCarouselIndex.clear();
        for (const m of mapped) this.liveCarouselIndex.set(this.liveKey(m), 0);

        // build Base Model options
        this.liveBaseModels.clear();
        for (const m of mapped) {
          const key = this.canonBaseModel(m?.baseModel);
          const label = this.displayBaseModel(m?.baseModel);
          if (!this.liveBaseModels.has(key)) this.liveBaseModels.set(key, label);
        }
        this.selectAllLiveBaseModels();

        this.liveSibLoading = false;
      },
      error: (err) => {
        console.error('fetchLiveSiblings failed:', err);
        this.liveSibError = 'Failed to load versions from Civitai.';
        this.liveSibLoading = false;
      }
    });
  }

  // === Base-model filter helpers (Live) ===
  isLiveBaseModelSelected(key: string): boolean {
    return this.liveSelectedBaseModels.has(key);
  }
  toggleLiveBaseModel(key: string, on: boolean) {
    if (on) this.liveSelectedBaseModels.add(key);
    else this.liveSelectedBaseModels.delete(key);
  }
  selectAllLiveBaseModels() {
    this.liveSelectedBaseModels = new Set(Array.from(this.liveBaseModels.keys()));
  }
  clearLiveBaseModels() {
    this.liveSelectedBaseModels.clear();
  }
  get liveBaseModelLabels(): { key: string; label: string }[] {
    return Array.from(this.liveBaseModels.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
  get liveNoBaseModelSelected(): boolean {
    return this.liveBaseModels.size > 0 && this.liveSelectedBaseModels.size === 0;
  }
  onLiveBaseModelCheckboxChange(key: string, evt: Event) {
    const checked = (evt.target as HTMLInputElement).checked;
    this.toggleLiveBaseModel(key, checked);
  }

  // === Sorting/filtering (Live) ===
  get filteredAndSortedLiveResults(): any[] {
    const total = this.liveBaseModels.size;
    const selected = this.liveSelectedBaseModels.size;
    if (total > 0 && selected === 0) return [];

    const shouldFilter = selected > 0 && selected < total;
    const base = shouldFilter
      ? (this.liveSibResults ?? []).filter(m =>
        this.liveSelectedBaseModels.has(this.canonBaseModel(m?.baseModel)))
      : (this.liveSibResults ?? []);

    // newest uploaded first (reuse uploadedTime())
    return base.slice().sort(
      (a, b) => this.uploadedTime(b?.uploaded) - this.uploadedTime(a?.uploaded)
    );
  }

  // === Mini carousel helpers (Live) ===
  private liveKey(m: any): string {
    return `${m?.modelNumber ?? ''}_${m?.versionNumber ?? ''}`;
  }
  private liveImages(m: any): Array<{ url: string }> {
    // reuse your existing helper that accepts JSON string or array
    return this.simSafeImageArray(m?.imageUrls);
  }
  liveImageCount(m: any): number {
    return this.liveImages(m).length;
  }
  liveCurrentImage(m: any): string {
    const imgs = this.liveImages(m);
    if (!imgs.length) return '';
    const key = this.liveKey(m);
    const i = this.liveCarouselIndex.get(key) ?? 0;
    const idx = ((i % imgs.length) + imgs.length) % imgs.length;
    return imgs[idx]?.url || '';
  }
  prevLiveImage(m: any, evt?: Event) {
    evt?.stopPropagation();
    const imgs = this.liveImages(m);
    if (imgs.length < 2) return;
    const key = this.liveKey(m);
    const i = this.liveCarouselIndex.get(key) ?? 0;
    this.liveCarouselIndex.set(key, (i - 1 + imgs.length) % imgs.length);
  }
  nextLiveImage(m: any, evt?: Event) {
    evt?.stopPropagation();
    const imgs = this.liveImages(m);
    if (imgs.length < 2) return;
    const key = this.liveKey(m);
    const i = this.liveCarouselIndex.get(key) ?? 0;
    this.liveCarouselIndex.set(key, (i + 1) % imgs.length);
  }
  liveTrackBy = (_: number, m: any) => this.liveKey(m);


  close() { this.closed.emit(); }
}
