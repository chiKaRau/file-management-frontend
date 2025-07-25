import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { ExplorerStateService } from '../../services/explorer-state.service';
import { DirectoryItem } from '../file-list/model/directory-item.model';

@Component({
  selector: 'app-explorer-toolbar',
  templateUrl: './explorer-toolbar.component.html',
  styleUrls: ['./explorer-toolbar.component.scss']
})
export class ExplorerToolbarComponent {
  @Input() currentPath: string | null = null;
  @Input() canGoBack: boolean = false;
  @Input() canGoForward: boolean = false;
  @Input() isPreloadComplete: boolean = false;
  @Output() back = new EventEmitter<void>();
  @Output() forward = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() searchQuery = new EventEmitter<string>();
  @Output() pathChanged = new EventEmitter<string>(); // user enters new path
  @Output() updateAllModels = new EventEmitter<void>();
  @Output() manualUpdateLocalPath = new EventEmitter<void>();
  @Output() subdirSelect = new EventEmitter<string>();

  isEditingPath = false;

  selectedSubdirIndex = 0;
  lockEnabled = false;
  lockedDirName: string | null = null;
  private lockedSubDirs: DirectoryItem[] = [];



  constructor(public explorerState: ExplorerStateService) { } // Injected as public to bind in the template

  // In the future, you can also emit an event for "enter new path"
  // @Output() pathEntered = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentPath'] && !this.lockEnabled) {
      this.selectedSubdirIndex = 0;
    }
  }

  onBack() {
    this.back.emit();
  }

  onForward() {
    this.forward.emit();
  }

  onRefresh() {
    this.refresh.emit();
  }

  onSearchChange(value: string) {
    // Emit search text to the parent
    this.searchQuery.emit(value);
  }

  /** 
     * Return an array of path segments. 
     * We also truncate if it's very deep, showing '...' plus last few.
     */
  get truncatedBreadcrumbs(): string[] {
    if (!this.currentPath) {
      return [];
    }
    // Split on backslash or forward slash
    const parts = this.currentPath.split(/[\\/]/).filter(Boolean);

    // If the path is short, show all
    const maxSegments = 4;
    if (parts.length <= maxSegments) {
      return parts;
    }
    // If too many segments, show "..." then the last 3 (or however many you want)
    const shorted = ['...', ...parts.slice(parts.length - (maxSegments - 1))];
    return shorted;
  }

  enterEditMode() {
    this.isEditingPath = true;
  }

  exitEditMode(newPath: string) {
    this.isEditingPath = false;
    // optionally call onPathEnter here if you want
    // but typically you'd only finalize on Enter
  }

  onPathEnter(newPath: string) {
    this.isEditingPath = false;
    if (newPath) {
      this.pathChanged.emit(newPath);
    }
  }

  /** 
   * If you want each breadcrumb segment clickable,
   * you can reconstruct partial paths here.
   */
  onBreadcrumbClick(index: number, event: MouseEvent) {
    event.stopPropagation(); // prevent toggling edit mode
    // If you want to navigate to a partial path, reconstruct from the splitted array
    const parts = this.currentPath?.split(/[\\/]/).filter(Boolean) || [];
    // if truncated, watch out for '...' at the start
    if (parts.length === 0) return;
    const maxSegments = 4;

    // Rebuild a path up to `index`
    let actualParts: string[] = parts;
    if (parts.length > maxSegments) {
      // We skip the first few since they're replaced by ...
      const hiddenCount = parts.length - (maxSegments - 1);
      // index 0 in truncatedBreadcrumbs is '...'
      if (index === 0) {
        // If user clicked '...', we might do nothing or show a bigger menu
        return;
      } else {
        // map truncated index to real index
        const realIndex = hiddenCount + (index - 1);
        actualParts = parts.slice(0, realIndex + 1);
      }
    } else {
      // no truncation
      actualParts = parts.slice(0, index + 1);
    }

    const partialPath = actualParts.join('/');
    this.pathChanged.emit(partialPath);
  }

  onFocus(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select(); // highlight existing text for easy replacement
  }

  @Output() toggleZipSidebarEvent = new EventEmitter<void>();

  toggleZipSidebar(): void {
    this.toggleZipSidebarEvent.emit();
  }

  @Output() toggleGroupingSidebarEvent = new EventEmitter<void>();

  toggleGroupingSidebar(): void {
    this.toggleGroupingSidebarEvent.emit();
  }

  onUpdateAllModels() {
    this.updateAllModels.emit();
  }

  onManualUpdate() {
    this.manualUpdateLocalPath.emit();
  }

  get subDirectories(): DirectoryItem[] {
    return this.explorerState.directoryContents.filter(i => i.isDirectory);
  }

  get displayedSubDirectories(): DirectoryItem[] {
    return this.lockEnabled ? this.lockedSubDirs : this.subDirectories;
  }

  onSubdirChange(idx: number) {
    this.selectedSubdirIndex = idx;
    const dir = this.displayedSubDirectories[idx];
    if (dir) {
      this.subdirSelect.emit(dir.path);
    }
  }

  prevSubdir() {
    if (this.selectedSubdirIndex > 0) {
      this.onSubdirChange(this.selectedSubdirIndex - 1);
    }
  }

  nextSubdir() {
    if (this.selectedSubdirIndex < this.displayedSubDirectories.length - 1) {
      this.onSubdirChange(this.selectedSubdirIndex + 1);
    }
  }

  onLockChange(locked: boolean) {
    this.lockEnabled = locked;

    if (locked) {
      // snapshot subdirs
      this.lockedSubDirs = [...this.subDirectories];
      this.selectedSubdirIndex = 0;
      // extract the folder name from currentPath
      const parts = this.currentPath?.split(/[\\/]/).filter(Boolean) || [];
      this.lockedDirName = parts.length > 0 ? parts[parts.length - 1] : this.currentPath;
    } else {
      // clear lock
      this.lockedSubDirs = [];
      this.selectedSubdirIndex = 0;
      this.lockedDirName = null;
    }
  }
}
