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
  // Emit the full model data when the modal should be opened.
  @Output() openModalEvent = new EventEmitter<any>();

  modelVersion: any = null;
  currentImageIndex: number = 0;

  // New properties for spinner and error handling.
  isLoading: boolean = false;
  error: string | null = null;

  constructor(private http: HttpClient, private explorerState: ExplorerStateService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['item'] && this.item && !this.item.isDirectory) {
      // Reset error and show spinner
      this.error = null;
      this.isLoading = true;
      // Example file name format: {modelID}_{versionID}_{baseModel}_{filename}.{extension}
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

  fetchModelVersion(versionID: string) {
    const url = `https://civitai.com/api/v1/model-versions/${versionID}`;
    this.http.get<any>(url).subscribe(
      (data) => {
        console.log("Civitai API result: ");
        console.log(data);
        this.modelVersion = data;
        this.currentImageIndex = 0;
        this.isLoading = false;

        this.updateModel({
          stats: this.modelVersion?.stats
        });
      },
      (err) => {
        console.error('Error fetching model version data:', err);
        this.error = 'Failed to load model details.';
        this.isLoading = false;
      }
    );
  }


  updateModel(updateFields: { [key: string]: any }): void {
    if (!this.item) {
      console.error('No item selected');
      return;
    }

    const parts = this.item.name.split('_');
    if (parts.length < 2) {
      console.error('Invalid file name format.');
      return;
    }

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
      next: (response) => {
        console.log('API update successful:', response);

        if (this.item && updateFields.stats) {
          if (!this.item.scanData) {
            this.item.scanData = {};
          }
          this.item.scanData.stats = JSON.stringify(updateFields.stats);
          console.log('Local item stats updated:', this.item.scanData.stats);

          const targetIndex = this.explorerState.directoryContents.findIndex(
            (i) => i.path === this.item!.path
          );

          if (targetIndex !== -1) {
            Object.assign(this.explorerState.directoryContents[targetIndex], {
              scanData: {
                ...(this.explorerState.directoryContents[targetIndex].scanData || {}),
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


  // Called when the carousel image is clicked.
  openModal() {
    this.openModalEvent.emit(this.modelVersion);
  }

  // Carousel helper methods
  get currentImageUrl(): string {
    if (this.modelVersion && this.modelVersion.images && this.modelVersion.images.length > 0) {
      return this.modelVersion.images[this.currentImageIndex].url;
    }
    return '';
  }

  prevImage() {
    if (this.modelVersion?.images) {
      this.currentImageIndex =
        (this.currentImageIndex - 1 + this.modelVersion.images.length) %
        this.modelVersion.images.length;
    }
  }

  nextImage() {
    if (this.modelVersion?.images) {
      this.currentImageIndex =
        (this.currentImageIndex + 1) % this.modelVersion.images.length;
    }
  }

  close(): void {
    this.closed.emit();
  }
}
