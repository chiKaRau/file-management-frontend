// src/app/update/update-sidebar.component.ts
import { Component, HostBinding, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { DirectoryItem } from '../file-list/model/directory-item.model';
import { SearchProgress, SearchService } from '../../services/search.service';

@Component({
  selector: 'app-update-sidebar',
  templateUrl: './update-sidebar.component.html',
  styleUrls: ['./update-sidebar.component.scss']
})
export class UpdateSidebarComponent implements OnInit, OnDestroy {
  // Ensure the host element gets the class "update-sidebar"
  @HostBinding('class') hostClass = 'update-sidebar';

  @Input() item: DirectoryItem | null = null;
  @Output() closed = new EventEmitter<void>();

  progressMessage: string = '';
  results: string[] = [];
  searching: boolean = false;
  private searchSubscription: Subscription | null = null;

  constructor(private searchService: SearchService) { }

  ngOnInit() {
    if (this.item) {
      // Assume file name is in the format "modelId_versionId_..."
      const parts = this.item.name.split('_');
      if (parts.length >= 2) {
        const modelId = parts[0];
        const versionId = parts[1];
        this.startSearch(modelId, versionId);
      } else {
        this.progressMessage = 'File name does not match expected format.';
      }
    }
  }

  startSearch(modelId: string, versionId: string) {
    this.searching = true;
    this.searchSubscription = this.searchService.searchByModelAndVersion(modelId, versionId)
      // If needed, you can use throttleTime here to limit UI updates:
      // .pipe(throttleTime(100))
      .subscribe({
        next: (data: SearchProgress) => {
          // data.progress should be something like:
          // "Scanning directory: ..." or "Processing file: 123_123_pony_abc.png"
          this.progressMessage = data.progress;
          this.results = data.results;
        },
        error: (err) => {
          console.error(err);
          this.progressMessage = 'Error during search.';
          this.searching = false;
        },
        complete: () => {
          this.searching = false;
        }
      });
  }

  close() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    this.closed.emit();
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
}
