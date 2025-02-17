import { Component, HostBinding, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import * as path from 'path';
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

  // Precise timer values.
  elapsedTime: number = 0;
  finalElapsedTime: number | null = null;
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
      // Reset values.
      this.results = [];
      this.progressMessage = '';
      this.elapsedTime = 0;
      this.finalElapsedTime = null;

      if (this.item) {
        this.startSearchForItem(this.item);
      }
    }
  }

  // Extract the model/version IDs from the file name and determine a hint (if available).
  private startSearchForItem(item: DirectoryItem) {
    const parts = item.name.split('_');
    if (parts.length >= 2) {
      const modelId = parts[0];
      const versionId = parts[1];
      // Determine hintPath from item.path if it contains "update"
      let hintPath: string | undefined;
      const lowerPath = item.path.toLowerCase();
      const updateIndex = lowerPath.indexOf('\\update\\');
      if (updateIndex !== -1) {
        // Extract the part after "\update\"
        const afterUpdate = item.path.substring(updateIndex + 8);
        // Remove the file name by taking the directory name
        hintPath = path.dirname(afterUpdate);
        // For example, if afterUpdate is "Appearance\Mud\file.png", hintPath becomes "Appearance\Mud"
      }
      this.startSearch(modelId, versionId, hintPath);
    } else {
      this.progressMessage = 'File name does not match expected format.';
    }
  }

  startSearch(modelId: string, versionId: string, hintPath?: string) {
    this.searching = true;
    this.startTime = performance.now();
    this.elapsedTime = 0;
    this.finalElapsedTime = null;

    // Update elapsed time every 100ms.
    this.timerSubscription = interval(100).subscribe(() => {
      this.elapsedTime = (performance.now() - this.startTime) / 1000;
    });

    // Pass the hintPath to the search service.
    this.searchSubscription = this.searchService
      .searchByModelAndVersion(modelId, versionId, hintPath)
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
