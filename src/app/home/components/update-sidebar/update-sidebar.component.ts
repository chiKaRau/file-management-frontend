import { Component, HostBinding, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { DirectoryItem } from '../file-list/model/directory-item.model';
import { SearchProgress, SearchService } from '../../services/search.service';

@Component({
  selector: 'app-update-sidebar',
  templateUrl: './update-sidebar.component.html',
  styleUrls: ['./update-sidebar.component.scss']
})
export class UpdateSidebarComponent implements OnInit, OnChanges, OnDestroy {
  @HostBinding('class') hostClass = 'update-sidebar';

  @Input() item: DirectoryItem | null = null;
  @Output() closed = new EventEmitter<void>();

  progressMessage: string = '';
  results: string[] = [];
  searching: boolean = false;
  private searchSubscription: Subscription | null = null;

  constructor(private searchService: SearchService) { }

  ngOnInit() {
    // Initial search if item is available
    if (this.item) {
      this.startSearchForItem(this.item);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // If the "item" input changes, restart the search.
    if (changes['item'] && !changes['item'].firstChange) {
      // Clean up previous search if it's still running.
      if (this.searchSubscription) {
        this.searchSubscription.unsubscribe();
        this.searchSubscription = null;
      }
      // Clear old results and reset progress message
      this.results = [];
      this.progressMessage = '';

      // Start a new search for the new item.
      if (this.item) {
        this.startSearchForItem(this.item);
      }
    }
  }

  private startSearchForItem(item: DirectoryItem) {
    // Assume file name is in the format "modelId_versionId_..."
    const parts = item.name.split('_');
    if (parts.length >= 2) {
      const modelId = parts[0];
      const versionId = parts[1];
      this.startSearch(modelId, versionId);
    } else {
      this.progressMessage = 'File name does not match expected format.';
    }
  }

  startSearch(modelId: string, versionId: string) {
    this.searching = true;
    this.searchSubscription = this.searchService.searchByModelAndVersion(modelId, versionId)
      .subscribe({
        next: (data: SearchProgress) => {
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
