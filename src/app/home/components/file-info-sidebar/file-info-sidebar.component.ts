import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { DirectoryItem } from '../file-list/model/directory-item.model';
import { HttpClient } from '@angular/common/http';

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

  constructor(private http: HttpClient) { }

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
    this.http.get(url).subscribe(
      (data) => {
        console.log(data);
        this.modelVersion = data;
        this.currentImageIndex = 0;
        this.isLoading = false;
      },
      (err) => {
        console.error('Error fetching model version data:', err);
        this.error = 'Failed to load model details.';
        this.isLoading = false;
      }
    );
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
