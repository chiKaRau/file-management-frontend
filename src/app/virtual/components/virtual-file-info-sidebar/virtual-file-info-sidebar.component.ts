import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-virtual-file-info-sidebar',
  templateUrl: './virtual-file-info-sidebar.component.html',
  styleUrls: ['./virtual-file-info-sidebar.component.scss']
})
export class VirtualFileInfoSidebarComponent implements OnChanges {
  @Input() selectedFile: any;
  @Output() closed = new EventEmitter<void>();
  @Output() openModalEvent = new EventEmitter<any>();
  @Output() modelUpdated = new EventEmitter<any>();  // Emits updated file

  modelVersion: any = null;
  currentImageIndex: number = 0;
  isLoading: boolean = false;
  error: string | null = null;

  constructor(private http: HttpClient) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedFile'] && this.selectedFile && !this.selectedFile.isDirectory) {
      // Reset previous modelVersion and error on file change.
      this.modelVersion = null;
      this.error = null;
      this.isLoading = true;
      // Use version from scanData.
      const versionID = this.selectedFile.scanData?.versionNumber;
      console.log('Using versionID from scanData:', versionID);
      if (versionID) {
        this.fetchModelVersion(versionID);
      } else {
        this.error = 'Invalid file format: Missing version information.';
        this.isLoading = false;
      }
    }
  }

  fetchModelVersion(versionID: string): void {
    const url = `https://civitai.com/api/v1/model-versions/${versionID}`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        console.log('Fetched model version data:', data);
        this.modelVersion = data;
        this.currentImageIndex = 0;
        this.isLoading = false;
        // Once we have fresh data, update the file record with new stats.
        this.updateModel({ stats: this.modelVersion.stats });
      },
      error: (err) => {
        console.error('Error fetching model version data:', err);
        this.error = 'Failed to load model details.';
        this.modelVersion = null;
        this.isLoading = false;
      }
    });
  }

  updateModel(updateFields: { [key: string]: any }): void {
    if (!this.selectedFile) {
      console.error('No file selected');
      return;
    }
    let modelId: string, versionId: string;
    // Use scanData values if available
    if (this.selectedFile.scanData && this.selectedFile.scanData.modelNumber && this.selectedFile.scanData.versionNumber) {
      modelId = this.selectedFile.scanData.modelNumber;
      versionId = this.selectedFile.scanData.versionNumber;
    } else {
      // Fallback to extracting from the file name
      const parts = this.selectedFile.name.split('_');
      if (parts.length < 2) {
        console.error('Invalid file name format.');
        return;
      }
      modelId = parts[0];
      versionId = parts[1];
    }

    const payload = {
      modelId,
      versionId,
      fieldsToUpdate: Object.keys(updateFields),
      ...updateFields
    };

    const apiUrl = 'http://localhost:3000/api/update-record-by-model-and-version';
    this.http.post(apiUrl, payload).subscribe({
      next: (response) => {
        console.log('API update successful:', response);
        if (this.selectedFile && updateFields.stats) {
          // Merge new stats with existing scanData so other fields remain intact.
          this.selectedFile.scanData = {
            ...this.selectedFile.scanData,
            stats: typeof updateFields.stats === 'string'
              ? updateFields.stats
              : JSON.stringify(updateFields.stats)
          };
          console.log('Local file stats updated:', this.selectedFile.scanData.stats);
          // Emit the updated file so that the parent can update the virtual file list.
          this.modelUpdated.emit(this.selectedFile);
        }
      },
      error: (error) => {
        console.error('Error updating model:', error);
      }
    });
  }


  get currentImageUrl(): string {
    if (this.modelVersion && this.modelVersion.images && this.modelVersion.images.length > 0) {
      return this.modelVersion.images[this.currentImageIndex].url;
    }
    return '';
  }

  prevImage(): void {
    if (this.modelVersion?.images) {
      this.currentImageIndex =
        (this.currentImageIndex - 1 + this.modelVersion.images.length) % this.modelVersion.images.length;
    }
  }

  nextImage(): void {
    if (this.modelVersion?.images) {
      this.currentImageIndex =
        (this.currentImageIndex + 1) % this.modelVersion.images.length;
    }
  }

  openModal(): void {
    if (this.modelVersion) {
      this.openModalEvent.emit(this.modelVersion);
    }
  }

  close(): void {
    this.closed.emit();
  }
}
