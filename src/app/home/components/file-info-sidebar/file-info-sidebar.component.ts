import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { DirectoryItem } from '../file-list/model/directory-item.model';
import { HttpClient } from '@angular/common/http';
import { ExplorerStateService } from '../../services/explorer-state.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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

  constructor(private http: HttpClient, private explorerState: ExplorerStateService, private sanitizer: DomSanitizer) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['item'] && this.item && !this.item.isDirectory) {
      this.error = null;
      this.isLoading = true;

      const ids = this.resolveIdsFromItem(this.item);
      if (ids) {
        this.fetchModelVersion(ids.versionID);   // <— use versionID from resolver
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

  /** Save to server and update local state */
  saveMyRating() {
    this.myRatingError = null;
    const val = Number(this.myRatingInput);
    if (!Number.isFinite(val) || val < 0 || val > 20) {
      this.myRatingError = 'Rating must be an integer from 0 to 20.';
      return;
    }

    // Resolve IDs to call your API
    const ids = this.resolveIdsFromItem(this.item);
    if (!ids) {
      this.myRatingError = 'Cannot resolve model/version IDs.';
      return;
    }

    this.savingMyRating = true;
    const body = { modelID: ids.modelID, versionID: ids.versionID, rating: Math.trunc(val) };
    this.http.post<any>('http://localhost:3000/api/update-myrating-by-modelId-and-versionId', body)
      .subscribe({
        next: (res) => {
          // update local cache so UI reflects immediately
          if (!this.dbData) this.dbData = {};
          if (!this.dbData.model) this.dbData.model = {};
          this.dbData.model.myRating = Math.trunc(val);

          // if your item has scanData and you want to surface it there too:
          if ((this.item as any)?.scanData) {
            (this.item as any).scanData.myRating = Math.trunc(val);
          }

          this.editingMyRating = false;
          this.savingMyRating = false;
        },
        error: (err) => {
          console.error('update myRating failed:', err);
          this.myRatingError = 'Failed to update rating.';
          this.savingMyRating = false;
        }
      });
  }

  /** Cancel editing without saving */
  cancelMyRatingEdit() {
    this.editingMyRating = false;
    this.myRatingError = null;
  }


  close() { this.closed.emit(); }
}
