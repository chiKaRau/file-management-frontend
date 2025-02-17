// update-sidebar.component.ts
import { Component, HostBinding, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import * as path from 'path';
import { DirectoryItem } from '../file-list/model/directory-item.model';
import { SearchProgress, SearchService } from '../../services/search.service';

interface CivitaiSet {
  setId: string;
  items: DirectoryItem[];
  isZip: boolean;
  previewPath?: string;
  folderPath?: string; // New property to store the folder where the set was found.
}

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
  // These will hold the raw file results and the grouped sets.
  foundItems: DirectoryItem[] = [];
  groupedItems: CivitaiSet[] = [];
  searching: boolean = false;

  // Timing properties.
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
      // Reset results and grouping.
      this.foundItems = [];
      this.groupedItems = [];
      this.progressMessage = '';
      this.elapsedTime = 0;
      this.finalElapsedTime = null;
      if (this.item) {
        this.startSearchForItem(this.item);
      }
    }
  }

  // Extract modelId and versionId from the file name, and determine a hint if possible.
  private startSearchForItem(item: DirectoryItem) {
    const parts = item.name.split('_');
    if (parts.length >= 2) {
      const modelId = parts[0];
      const versionId = parts[1];
      let hintPath: string | undefined;
      const lowerPath = item.path.toLowerCase();
      const updateIndex = lowerPath.indexOf('\\update\\');
      if (updateIndex !== -1) {
        // Get the directory part after "\update\" (excluding the file name)
        const afterUpdate = item.path.substring(updateIndex + 8);
        hintPath = path.dirname(afterUpdate);
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

    // Pass the selected file's path as ignorePath.
    const ignorePath = this.item?.path;

    this.searchSubscription = this.searchService
      .searchByModelAndVersion(modelId, versionId, hintPath, ignorePath)
      .subscribe({
        next: (data: SearchProgress) => {
          this.progressMessage = data.progress;
          // Map each file path into a DirectoryItem.
          this.foundItems = data.results.map(filePath => {
            const fileName = filePath.split(/\\|\//).pop() || filePath;
            return {
              name: fileName,
              path: filePath,
              isFile: true,
              isDirectory: false
            } as DirectoryItem;
          });
          // Update grouping in real time.
          this.groupedItems = this.groupItems(this.foundItems);
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
          // Final grouping.
          this.groupedItems = this.groupItems(this.foundItems);
          console.log(`Search completed in ${this.finalElapsedTime} seconds.`);
        }
      });
  }

  // Group files into sets based on a normalized base name.
  private groupItems(items: DirectoryItem[]): CivitaiSet[] {
    const groups = new Map<string, CivitaiSet>();

    for (const item of items) {
      const setId = this.normalizeSetId(item.name);
      if (!groups.has(setId)) {
        groups.set(setId, { setId, items: [], isZip: false });
      }
      const group = groups.get(setId)!;
      group.items.push(item);

      // Mark group as having a ZIP if any file ends with .zip.
      if (item.name.toLowerCase().endsWith('.zip')) {
        group.isZip = true;
      }

      // For preview, pick an image.
      // We prefer one whose name includes "preview".
      if (this.isImage(item)) {
        const lowerName = item.name.toLowerCase();
        if (!group.previewPath) {
          group.previewPath = item.path;
        } else {
          if (!group.previewPath.toLowerCase().includes('preview') && lowerName.includes('preview')) {
            group.previewPath = item.path;
          }
        }
      }
    }

    // After grouping, assign folderPath from the previewPath (if available).
    groups.forEach(group => {
      if (group.previewPath) {
        group.folderPath = path.dirname(group.previewPath);
      }
    });

    return Array.from(groups.values());
  }

  // Normalize a file name to get the set id by taking everything before the first dot.
  private normalizeSetId(fileName: string): string {
    const match = fileName.match(/^([^\.]+)/);
    return match ? match[1] : fileName;
  }

  isImage(item: DirectoryItem): boolean {
    return /\.(png|jpe?g|gif|webp)$/i.test(item.name);
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
