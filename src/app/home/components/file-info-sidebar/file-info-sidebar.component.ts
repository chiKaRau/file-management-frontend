import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { DirectoryItem } from '../file-list/model/directory-item.model';
import { HttpClient } from '@angular/common/http';
import { ExplorerStateService } from '../../services/explorer-state.service';

@Component({
  selector: 'app-file-info-sidebar',
  templateUrl: './file-info-sidebar.component.html',
  styleUrls: ['./file-info-sidebar.component.scss']
})
export class FileInfoSidebarComponent implements OnChanges {
  @Input() item: DirectoryItem | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() openModalEvent = new EventEmitter<any>();

  modelVersion: any = null;
  currentImageIndex: number = 0;

  isLoading: boolean = false;
  error: string | null = null;

  // ==== NEW: Local DB overlay state ====
  dbOverlayOpen = false;
  dbLoading = false;
  dbError: string | null = null;
  dbData: any = null;

  dbImages: Array<{ url: string; width?: number; height?: number; nsfw?: any }> = [];
  dbImageIndex = 0;

  constructor(private http: HttpClient, private explorerState: ExplorerStateService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['item'] && this.item && !this.item.isDirectory) {
      this.error = null;
      this.isLoading = true;

      // Example file name: {modelID}_{versionID}_{baseModel}_{filename}.{ext}
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

  // ====== Civitai live fetch (existing) ======
  fetchModelVersion(versionID: string) {
    const url = `https://civitai.com/api/v1/model-versions/${versionID}`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        this.modelVersion = data;
        this.currentImageIndex = 0;
        this.isLoading = false;

        this.updateModel({
          stats: this.modelVersion?.stats
        });
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
      modelId,
      versionId,
      fieldsToUpdate: Object.keys(updateFields),
      ...updateFields
    };

    const apiUrl = 'http://localhost:3000/api/update-record-by-model-and-version';

    this.http.post(apiUrl, payload).subscribe({
      next: () => {
        // Mirror stats into local item for consistency
        if (this.item && updateFields.stats) {
          if (!this.item.scanData) this.item.scanData = {};
          this.item.scanData.stats = JSON.stringify(updateFields.stats);

          const idx = this.explorerState.directoryContents.findIndex(i => i.path === this.item!.path);
          if (idx !== -1) {
            Object.assign(this.explorerState.directoryContents[idx], {
              scanData: {
                ...(this.explorerState.directoryContents[idx].scanData || {}),
                stats: JSON.stringify(updateFields.stats)
              }
            });
          }
        }
      },
      error: (error) => {
        console.error('Error updating model:', error);
      }
    });
  }

  // ====== Modal from Civitai images (existing) ======
  openModal() {
    this.openModalEvent.emit(this.modelVersion);
  }

  get currentImageUrl(): string {
    if (this.modelVersion?.images?.length) {
      return this.modelVersion.images[this.currentImageIndex].url;
    }
    return '';
  }

  prevImage() {
    if (this.modelVersion?.images?.length) {
      this.currentImageIndex =
        (this.currentImageIndex - 1 + this.modelVersion.images.length) %
        this.modelVersion.images.length;
    }
  }

  nextImage() {
    if (this.modelVersion?.images?.length) {
      this.currentImageIndex =
        (this.currentImageIndex + 1) % this.modelVersion.images.length;
    }
  }

  close(): void {
    this.closed.emit();
  }

  // ====== NEW: Local DB overlay ======

  openDbOverlay(): void {
    this.dbOverlayOpen = true;
    this.fetchLocalRecord();
  }

  closeDbOverlay(): void {
    this.dbOverlayOpen = false;
  }

  private getIdsFromItem(): { modelID: string; versionID: string } | null {
    if (!this.item) return null;
    const parts = this.item.name.split('_');
    if (parts.length >= 2) {
      return { modelID: parts[0], versionID: parts[1] };
    }
    return null;
  }

  private parseJsonField<T>(input: any, fallback: T): T {
    if (input == null) return fallback;
    if (typeof input !== 'string') return input as T;
    try { return JSON.parse(input) as T; } catch { return fallback; }
  }

  fetchLocalRecord(): void {
    const ids = this.getIdsFromItem();
    if (!ids) {
      this.dbError = 'Invalid file name format.';
      this.dbData = null;
      this.dbImages = [];
      this.dbLoading = false;
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
          this.dbData = null;
          this.dbImages = [];
          this.dbLoading = false;
          return;
        }

        this.dbData = res.payload;

        // Prepare overlay images (payload.images.imageUrls is a JSON string)
        const imgs = this.parseJsonField<any[]>(this.dbData?.images?.imageUrls, []);
        this.dbImages = Array.isArray(imgs) ? imgs : [];
        this.dbImageIndex = 0;

        this.dbLoading = false;
      },
      error: (err) => {
        console.error('Local DB fetch failed:', err);
        this.dbError = 'Failed to load from local database.';
        this.dbData = null;
        this.dbImages = [];
        this.dbLoading = false;
      }
    });
  }

  // Derived getters for clean template bindings
  get dbTags(): string[] {
    return this.parseJsonField<string[]>(this.dbData?.model?.tags, []);
  }
  get dbTriggerWords(): string[] {
    return this.parseJsonField<string[]>(this.dbData?.model?.triggerWords, []);
  }
  get dbStats(): any {
    return this.parseJsonField<any>(this.dbData?.details?.stats, null);
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
}
