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

  // NEW: let parent tell us which context we’re in
  @Input() isReadOnly: boolean = false;

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

  // ExplorerToolbarComponent (inputs)
  @Input() visitedSubDirectories: { name: string; path: string; lastAccessedAt?: string }[] = [];


  constructor(public explorerState: ExplorerStateService) { } // Injected as public to bind in the template

  // In the future, you can also emit an event for "enter new path"
  // @Output() pathEntered = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentPath'] && !this.lockEnabled) {
      this.selectedSubdirIndex = 0;
    }
    // Recompute latest key on relevant input changes
    if (changes['visitedSubDirectories'] || changes['currentPath'] || changes['isReadOnly']) {
      // force recompute on next getter access by clearing cache; getter will call recompute
      // (No-op here; displayedSubDirectories calls recomputeLatestVisitedKey)
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
    const list = this.isReadOnly
      ? this.explorerState.virtualDirectoryContents
      : this.explorerState.fsDirectoryContents;
    return (list || []).filter(i => i.isDirectory);
  }

  // ExplorerToolbarComponent (getter)
  // prefer visitedSubDirectories when present; else fall back to current logic
  get displayedSubDirectories(): any[] {
    // Base list = actual subdirectories from current view (or locked snapshot)
    const base: any[] = this.lockEnabled ? (this.lockedSubDirs as any[]) : (this.subDirectories as any[]);

    // Build a map of visited by normalized key
    const vmap = new Map<string, { lastAccessedAt?: string }>();
    for (const v of (this.visitedSubDirectories ?? [])) {
      vmap.set(this.normalizeKey(v.path), { lastAccessedAt: v.lastAccessedAt });
    }

    // Merge: keep only actual subdirs, enrich with lastAccessedAt if present
    const merged = base.map(d => {
      const key = this.normalizeKey(d.path);
      const last = vmap.get(key)?.lastAccessedAt;
      return {
        // retain original DirectoryItem fields you rely on:
        ...d,
        name: d.name ?? this.leafName(d.path),
        lastAccessedAt: last,
        _key: key
      };
    });

    // Refresh the “freshest” visited key among those we actually display
    this.recomputeLatestVisitedKey(merged);

    return merged;
  }

  private recomputeLatestVisitedKey(merged: any[]): void {
    const allowed = new Set<string>(merged.map(m => m._key));
    let bestKey = '';
    let bestTime = -1;

    for (const v of (this.visitedSubDirectories ?? [])) {
      const k = this.normalizeKey(v.path);
      if (!allowed.has(k)) continue;            // only arrow items that are actually in the dropdown
      const t = this.toTime(v.lastAccessedAt);
      if (t > bestTime) { bestTime = t; bestKey = k; }
    }
    this.latestVisitedKey = bestKey;
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
      this.lockedSubDirs = [...this.subDirectories];
      this.selectedSubdirIndex = 0;
      const parts = this.currentPath?.split(/[\\/]/).filter(Boolean) || [];
      this.lockedDirName = parts.length > 0 ? parts[parts.length - 1] : this.currentPath;
    } else {
      this.lockedSubDirs = [];
      this.selectedSubdirIndex = 0;
      this.lockedDirName = null;
    }
    // Latest arrow may change when locking/unlocking
    this.recomputeLatestVisitedKey(this.displayedSubDirectories as any[]);
  }

  // Add below your existing inputs/getters in ExplorerToolbarComponent

  /** Are we showing the visited list (so we have lastAccessedAt)? */
  get usingVisitedList(): boolean {
    return !this.lockEnabled && !!this.visitedSubDirectories?.length;
  }

  /** Cache the freshest visited key among *displayed* items */
  private latestVisitedKey: string = '';

  /** Normalize a path to a key that ignores the drive and slashes. */
  private normalizeKey(p?: string): string {
    if (!p) return '';
    let s = p.replace(/^[A-Za-z]:/, ''); // drop "F:" / "G:"
    s = s.replace(/\\/g, '/');           // to POSIX
    s = s.replace(/\/+$/, '');           // trim trailing slash
    return s;
  }

  /** Get leaf folder name from a path. */
  private leafName(p?: string): string {
    if (!p) return 'Unknown';
    const parts = this.normalizeKey(p).split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : 'Unknown';
  }

  private toTime(iso?: string): number {
    if (!iso) return -1;
    // If no timezone suffix (no 'Z' or ±HH:MM), assume UTC
    const hasTZ = /Z|[+-]\d{2}:\d{2}$/.test(iso);
    const normalized = hasTZ ? iso : `${iso}Z`;
    const t = Date.parse(normalized);
    return Number.isFinite(t) ? t : -1;
  }

  private relativeTimeFromNow(iso?: string): string {
    const t = this.toTime(iso);
    if (t < 0) return 'Not access yet';
    let diff = Math.floor((Date.now() - t) / 1000); // seconds
    if (diff < 0) diff = 0;

    if (diff === 0) return 'just now';            // ← nicer than "0 seconds ago"
    if (diff < 60) return `${diff} second${diff === 1 ? '' : 's'} ago`;

    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

    const months = Math.floor(days / 30.44);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

    const years = Math.floor(days / 365.25);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }

  /** Build the label for the dropdown option. */
  optionLabel(entry: any): string {
    const name = entry?.name ?? 'Unknown';
    const when = entry?.lastAccessedAt ? this.relativeTimeFromNow(entry.lastAccessedAt) : 'Not access yet';
    const arrow = (entry?._key && entry._key === this.latestVisitedKey) ? ' <-' : '';
    return `${name} (Last access: ${when})${arrow}`;
  }



}
