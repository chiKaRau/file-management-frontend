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

  showSidebarCarousel = true;
  showFullCarousel = true;

  constructor(private http: HttpClient, private explorerState: ExplorerStateService, private sanitizer: DomSanitizer) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['item'] && this.item && !this.item.isDirectory) {
      this.error = null;
      this.isLoading = true;

      // file name: {modelID}_{versionID}_{...}
      const parts = this.item.name.split('_');
      if (parts.length >= 2) {
        const versionID = parts[1];
        this.fetchModelVersion(versionID);
      } else {
        this.error = 'Invalid file name format.';
        this.isLoading = false;
      }
    }
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

  toggleSidebarCarousel() { this.showSidebarCarousel = !this.showSidebarCarousel; }
  toggleFullCarousel() { this.showFullCarousel = !this.showFullCarousel; }

  updateModel(updateFields: { [key: string]: any }): void {
    if (!this.item) return;
    const parts = this.item.name.split('_');
    if (parts.length < 2) return;

    const modelId = parts[0];
    const versionId = parts[1];

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
          const idx = this.explorerState.directoryContents.findIndex(i => i.path === this.item!.path);
          if (idx !== -1) {
            Object.assign(this.explorerState.directoryContents[idx], {
              scanData: { ...(this.explorerState.directoryContents[idx].scanData || {}), stats: JSON.stringify(updateFields.stats) }
            });
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
    const ids = this.getIdsFromItem();
    if (!ids) {
      this.dbError = 'Invalid file name format.';
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
      // if user tapped from the local carousel inside the sidebar, dbData is already present.
      // guard just in case:
      if (!this.dbData) {
        const ids = this.getIdsFromItem();
        if (!ids) {
          this.fullError = 'Invalid file name format.';
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

  // helpers
  private getIdsFromItem(): { modelID: string; versionID: string } | null {
    if (!this.item) return null;
    const parts = this.item.name.split('_');
    return parts.length >= 2 ? { modelID: parts[0], versionID: parts[1] } : null;
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

  close() { this.closed.emit(); }
}
