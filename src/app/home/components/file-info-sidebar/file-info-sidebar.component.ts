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

    const modelId = parts[0];    // Assumes modelId is the first part
    const versionId = parts[1];  // Assumes versionId is the second part

    // Create payload with the keys of the updateFields object as fieldsToUpdate
    const payload = ({
      modelId: modelId,
      versionId: versionId,
      fieldsToUpdate: Object.keys(updateFields),
      ...updateFields
    } as any);

    const apiUrl = 'http://localhost:3000/api/update-record-by-model-and-version';

    this.http.post(apiUrl, payload).subscribe({
      next: (response) => {
        console.log('Update successful:', response);
        // Manually update the local file object:
        if (this.item) {
          if (!this.item.scanData) {
            this.item.scanData = {};
          }
          // Since payload is cast as any, TS will allow us to access .stats
          this.item.scanData.stats = JSON.stringify(payload.stats);
          console.log('Local item updated with new stats:', this.item.scanData.stats);

          // Now update the shared state stored in ExplorerStateService.
          const index = this.explorerState.directoryContents.findIndex(
            (i) => i.path === this.item!.path
          );
          if (index !== -1) {
            this.explorerState.directoryContents[index] = { ...this.item! };
            // Reassign the array to trigger change detection
            this.explorerState.directoryContents = [
              ...this.explorerState.directoryContents
            ];
          }
        }
      },
      error: (error) => {
        console.error('Update failed:', error);
        // Optionally, display an error message to the user
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
