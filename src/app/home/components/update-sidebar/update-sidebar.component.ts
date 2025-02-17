import { Component, HostBinding, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subscription, interval } from 'rxjs';
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

  // Using numbers with decimals for precise time measurement
  elapsedTime: number = 0;          // Updated frequently during search (in seconds)
  finalElapsedTime: number | null = null; // Set when search completes
  private startTime: number = 0;
  private timerSubscription: Subscription | null = null;
  private searchSubscription: Subscription | null = null;

  constructor(private searchService: SearchService) { }

  ngOnInit() {
    if (this.item) {
      this.startSearchForItem(this.item);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['item'] && !changes['item'].firstChange) {
      if (this.searchSubscription) {
        this.searchSubscription.unsubscribe();
        this.searchSubscription = null;
      }
      // Reset values
      this.results = [];
      this.progressMessage = '';
      this.elapsedTime = 0;
      this.finalElapsedTime = null;

      if (this.item) {
        this.startSearchForItem(this.item);
      }
    }
  }

  private startSearchForItem(item: DirectoryItem) {
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
    // Use performance.now() for high-resolution timing
    this.startTime = performance.now();
    this.elapsedTime = 0;
    this.finalElapsedTime = null;

    // Update elapsedTime every 100ms for a smoother, more precise display
    this.timerSubscription = interval(100).subscribe(() => {
      this.elapsedTime = (performance.now() - this.startTime) / 1000;
    });

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
          if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
          }
        },
        complete: () => {
          this.searching = false;
          if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
          }
          // Calculate the final elapsed time using performance.now()
          this.finalElapsedTime = (performance.now() - this.startTime) / 1000;
          console.log(`Search completed in ${this.finalElapsedTime} seconds.`);
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
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }
}
