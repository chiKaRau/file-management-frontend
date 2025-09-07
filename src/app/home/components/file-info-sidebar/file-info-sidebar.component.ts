import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { DirectoryItem } from '../file-list/model/directory-item.model';
import { HttpClient } from '@angular/common/http';
import { ExplorerStateService } from '../../services/explorer-state.service';

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

  constructor(private http: HttpClient, private explorerState: ExplorerStateService) { }

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

  // helpers
  private getIdsFromItem(): { modelID: string; versionID: string } | null {
    if (!this.item) return null;
    const parts = this.item.name.split('_');
    return parts.length >= 2 ? { modelID: parts[0], versionID: parts[1] } : null;
  }
  private parseJsonField<T>(input: any, fallback: T): T {
    if (input == null) return fallback;
    if (typeof input !== 'string') return input as T;
    try { return JSON.parse(input) as T; } catch { return fallback; }
  }

  // derived getters for local fields
  get dbTags(): string[] { return this.parseJsonField<string[]>(this.dbData?.model?.tags, []); }
  get dbTriggerWords(): string[] { return this.parseJsonField<string[]>(this.dbData?.model?.triggerWords, []); }
  get dbStats(): any { return this.parseJsonField<any>(this.dbData?.details?.stats, null); }
  get dbCreator(): string { return this.dbData?.details?.creatorName ?? this.dbData?.model?.creatorName ?? ''; }
  get dbUrlAccessible(): boolean | null {
    const v = this.dbData?.model?.urlAccessable;
    if (v === true || v === false) return v;
    if (typeof v === 'string') {
      const s = v.toLowerCase().trim();
      if (s === 'true') return true;
      if (s === 'false') return false;
    }
    return null;
  }
  get dbCreatedAt(): string | Date | null { return this.dbData?.model?.createdAt ?? null; }
  get dbUpdatedAt(): string | Date | null { return this.dbData?.model?.updatedAt ?? null; }

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
