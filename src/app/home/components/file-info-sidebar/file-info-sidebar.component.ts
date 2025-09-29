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

  close() { this.closed.emit(); }
}
