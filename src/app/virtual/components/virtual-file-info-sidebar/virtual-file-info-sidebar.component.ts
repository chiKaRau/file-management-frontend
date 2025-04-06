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

  modelVersion: any = null;
  currentImageIndex: number = 0;
  isLoading: boolean = false;
  error: string | null = null;

  constructor(private http: HttpClient) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedFile'] && this.selectedFile && !this.selectedFile.isDirectory) {
      this.error = null;
      this.isLoading = true;
      const versionID = this.selectedFile.scanData?.versionNumber;
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
        this.modelVersion = data;
        this.currentImageIndex = 0;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching model version data:', err);
        this.error = 'Failed to load model details.';
        this.isLoading = false;
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
    // Emit the loaded model version to the parent
    this.openModalEvent.emit(this.modelVersion);
  }

  close(): void {
    this.closed.emit();
  }
}
