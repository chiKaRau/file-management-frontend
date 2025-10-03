import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { ElectronService } from '../core/services/electron/electron.service';
import { NavigationService } from './services/navigation.service';
import { ExplorerStateService } from './services/explorer-state.service';
import * as fs from 'fs';
import * as path from 'path';
import { ScrollStateService } from './services/scroll-state.service';
import { RecycleService } from '../recycle/recycle.service';
import { RecycleRecord } from '../recycle/model/recycle-record.model';
import { DirectoryItem } from './components/file-list/model/directory-item.model';
import { Subscription, lastValueFrom } from 'rxjs';
import { HomeRefreshService } from './services/home-refresh.service';
import { PreferencesService } from '../preferences/preferences.service';
import { FileListComponent } from './components/file-list/file-list.component';
import { HttpClient } from '@angular/common/http';
import { shell } from 'electron';
import { DATA_SOURCE } from '../shared/data-sources/DATA_SOURCE';
import { ExplorerDataSource } from '../shared/data-sources/data-source';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class HomeComponent implements OnInit, AfterViewInit {
  // Search filter
  searchTerm = '';

  // Distinguish file vs. empty area context menu
  showFileContextMenu = false;
  showEmptyAreaContextMenu = false;

  // Coordinates for context menu
  menuX = 0;
  menuY = 0;

  @ViewChild('sortSubmenu') sortSubmenuRef!: ElementRef<HTMLDivElement>;
  viewSubmenuOpen = false;
  sortSubmenuOpen = false;

  viewSubmenuShouldFlip = false;
  sortSubmenuShouldFlip = false;

  @ViewChild('listColumn') listColumnRef!: ElementRef<HTMLElement>;
  @ViewChild('statusBar') statusBarRef!: ElementRef<HTMLElement>;

  // The file the user right-clicked on (if any)
  selectedFile: DirectoryItem | null = null;

  // Optionally, keep track of all selected files from the file-list component.
  selectedFiles: DirectoryItem[] = [];

  // Add this new property in your HomeComponent class:
  contextFile: DirectoryItem | null = null;

  // New properties for update sidebar
  showUpdateSidebar: boolean = false;
  updateFile: DirectoryItem | null = null;

  // Holds the model object received from the sidebar to show in the modal
  selectedModelVersion: any = null;

  // In home.component.ts (inside the HomeComponent class)
  private typeaheadBuffer = '';
  private typeaheadTimer: any = null;
  private typeaheadTimeout = 1000; // in milliseconds

  // Add a property to store the scan result if needed:
  scannedModels: any[] = [];

  renderItems: DirectoryItem[] = [];

  visitedSubdirs: { name: string; path: string; lastAccessedAt?: string }[] = [];

  // field near other state
  visitedBasePath: string | null = null;

  deepSearchActive = false;
  deepSearchItems: DirectoryItem[] = [];

  /** debounce timer for search */
  private searchDebounceTimer: any = null;

  // Keep a subscription reference so we can unsubscribe later.
  private homeRefreshSub!: Subscription;

  // Add near your other properties at the top of the class
  isPreloadComplete: boolean = false;

  // In HomeComponent
  clipboard: { type: 'cut' | 'copy'; items: DirectoryItem[] } | null = null;

  // Controls the visibility of the zip sidebar
  showZipSidebar: boolean = false;

  // New properties for update-all overlay.
  isUpdatingAllModels: boolean = false;
  currentUpdateModel: string = '';

  sortKey: 'name' | 'size' | 'modified' | 'created' | 'myRating' = 'name';
  sortDir: 'asc' | 'desc' = 'asc';

  // home.component.ts (top-level fields)
  public get isReadOnly(): boolean { return !!this.dataSource?.readOnly; }

  availableDrives: string[] = [];
  selectedDrive: string = 'all';
  groupingMode = false; // if you want the toggle wire-up

  // add near other ViewChilds
  @ViewChild('scrollRoot') scrollRootRef!: ElementRef<HTMLElement>;

  private vPath: string | null = null;
  private vPage = 0;
  private vSize = 100;
  private vTotalPages = 0;
  private vLoading = false;

  constructor(
    private electronService: ElectronService,
    private scrollState: ScrollStateService,
    private homeRefreshService: HomeRefreshService,
    private ngZone: NgZone,
    public navigationService: NavigationService,
    public explorerState: ExplorerStateService,
    public recycleService: RecycleService,
    public preferencesService: PreferencesService,
    private http: HttpClient,
    @Inject(DATA_SOURCE) public dataSource: ExplorerDataSource,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    setTimeout(() => window.scrollTo(0, this.scrollState.homeScrollPosition), 0);

    this.homeRefreshSub = this.homeRefreshService.refresh$.subscribe(() => {
      if (this.selectedDirectory) this.onRefresh();
    });

    if (this.isReadOnly) {
      // Virtual / DB mode
      this.navigationService.setContext('virtual');

      // If we already have a virtual folder loaded, just show it.
      if (this.explorerState.virtualDirectoryContents.length > 0 &&
        this.explorerState.virtualSelectedDirectory) {
        return;
      }

      // First time in virtual: pick a start path and load it.
      const start =
        this.navigationService.getCurrentFor?.('virtual') ??
        this.dataSource.initialPath ?? '\\';

      this.selectedDirectory = start;
      this.isLoading = true;
      this.navigationService.navigateTo(start);
      this.loadDirectoryContents(start);
    } else {
      // Filesystem mode
      this.navigationService.setContext('fs');

      // If we already have an FS folder loaded, do nothing (preserve it).
      // Otherwise wait for user to choose a folder as before.
    }
  }

  private readonly PAGE_SIZE = 100;    // tune 100–400
  visibleCount = this.PAGE_SIZE;
  private io?: IntersectionObserver;

  get visibleItems(): DirectoryItem[] {
    return this.renderItems.slice(0, this.visibleCount);
  }

  private resetWindow() {
    if (this.isReadOnly) {
      // Virtual (DB) mode: always show everything we’ve loaded so far
      this.visibleCount = this.renderItems.length;
      return;
    }

    // FS mode: keep client-side windowing
    this.visibleCount = this.PAGE_SIZE;
    if (this.renderItems.length <= this.visibleCount) return;
  }


  private expandWindow() {
    if (this.visibleCount < this.renderItems.length) {
      this.visibleCount = Math.min(this.visibleCount + this.PAGE_SIZE, this.renderItems.length);
      this.cdr.detectChanges();
    }
  }

  // After your view init, wire the sentinel
  @ViewChild('infiniteSentinel') infiniteSentinel!: ElementRef<HTMLElement>;

  ngAfterViewInit() {
    this.syncStatusBar();
    setTimeout(() => this.syncStatusBar(), 0);
    window.scrollTo(0, this.scrollState.homeScrollPosition);

    const rootEl = this.scrollRootRef?.nativeElement ?? null;

    this.io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;

        if (this.isReadOnly) {
          const hasNext = this.vTotalPages === 0 || (this.vPage + 1) < this.vTotalPages;
          if (hasNext && !this.vLoading && !this.deepSearchActive && !this.searchTerm) {
            this.fetchNextVirtualPage();
          }
        } else {
          this.expandWindow();
        }
      }
    }, {
      root: rootEl,          // ⬅️ key change
      rootMargin: '400px 0px',
      threshold: 0.01
    });

    setTimeout(() => this.infiniteSentinel && this.io?.observe(this.infiniteSentinel.nativeElement), 0);
  }

  ngOnDestroy() {
    this.io?.disconnect();
    if (this.homeRefreshSub) this.homeRefreshSub.unsubscribe();
  }

  private recomputeRenderItems(): void {
    const isVirtual = this.isReadOnly;
    const drive = this.selectedDrive;
    const term = (this.searchTerm || '').toLowerCase();

    // Use deep results as the source when active
    let contents = this.deepSearchActive ? (this.deepSearchItems ?? []) : (this.directoryContents ?? []);

    if (!this.deepSearchActive) {
      // normal filters only in non-deep mode
      if (isVirtual && drive !== 'all') {
        contents = contents.filter((it: any) => this.normalizeDrive(it?.drive) === this.normalizeDrive(drive));
      }

      contents = term
        ? contents.filter((item: any) => {
          if (item._searchText) return item._searchText.includes(term);
          const hay: string[] = [];
          if (item.name) hay.push(item.name);
          const sd = (item as any).scanData;
          if (sd) {
            if (sd.name) hay.push(sd.name);
            if (sd.baseModel) hay.push(sd.baseModel);
            if (Array.isArray(sd.tags)) hay.push(...sd.tags);
            if (sd.mainModelName) hay.push(sd.mainModelName);
            if (Array.isArray(sd.triggerWords)) hay.push(...sd.triggerWords);
            if (sd.modelNumber && sd.versionNumber) hay.push(`${sd.modelNumber}_${sd.versionNumber}`);
          }
          item._searchText = hay.join(' ').toLowerCase();
          return item._searchText.includes(term);
        })
        : contents;
    }

    const dirs = contents.filter(i => i.isDirectory).sort(this.compareItems);
    const files = contents.filter(i => i.isFile).sort(this.compareItems);

    this.renderItems = [...dirs, ...files];

    // ✅ reset virtualization window & notify
    this.resetWindow();
    this.cdr.markForCheck();
  }


  // handler wired from toolbar
  onLockContextChange(e: { locked: boolean; basePath: string | null }) {
    this.visitedBasePath = e.locked ? e.basePath : null;
    this.fetchVisitedChildren();   // refresh with the anchored parent
  }



  get selectedDirectory(): string | null {
    return this.isReadOnly
      ? this.explorerState.virtualSelectedDirectory
      : this.explorerState.fsSelectedDirectory;
  }
  set selectedDirectory(val: string | null) {
    if (this.isReadOnly) {
      this.explorerState.virtualSelectedDirectory = val;
    } else {
      this.explorerState.fsSelectedDirectory = val;
    }
  }

  get directoryContents(): DirectoryItem[] {
    return this.isReadOnly
      ? this.explorerState.virtualDirectoryContents
      : this.explorerState.fsDirectoryContents;
  }
  set directoryContents(val: DirectoryItem[]) {
    if (this.isReadOnly) {
      this.explorerState.virtualDirectoryContents = val;
    } else {
      this.explorerState.fsDirectoryContents = val;
    }
  }


  get errorMessage(): string | null {
    return this.explorerState.errorMessage;
  }
  set errorMessage(val: string | null) {
    this.explorerState.errorMessage = val;
  }

  get infoMessage(): string | null {
    return this.explorerState.infoMessage;
  }
  set infoMessage(val: string | null) {
    this.explorerState.infoMessage = val;
  }

  get isLoading(): boolean {
    return this.explorerState.isLoading;
  }
  set isLoading(val: boolean) {
    this.explorerState.isLoading = val;
  }

  // Filtered contents for search
  get filteredDirectoryContents(): DirectoryItem[] {
    let contents = this.directoryContents; // <- use the per-context slice
    // Virtual drive filter
    if (this.isReadOnly && this.selectedDrive !== 'all') {
      contents = contents.filter((it: any) =>
        this.normalizeDrive(it?.drive) === this.normalizeDrive(this.selectedDrive)
      );
    }

    if (!this.searchTerm) {
      const dir = contents.filter(i => i.isDirectory).sort(this.compareItems);
      const fil = contents.filter(i => i.isFile).sort(this.compareItems);
      return [...dir, ...fil];
    }

    const term = this.searchTerm.toLowerCase();
    const filtered = contents.filter((item: any) => {
      if (!this.isReadOnly) return (item.name || '').toLowerCase().includes(term);
      const haystacks: string[] = [];
      if (item.name) haystacks.push(item.name);
      const sd = item.scanData;
      if (sd) {
        if (sd.name) haystacks.push(sd.name);
        if (sd.baseModel) haystacks.push(sd.baseModel);
        if (Array.isArray(sd.tags)) haystacks.push(...sd.tags);
        if (sd.mainModelName) haystacks.push(sd.mainModelName);
        if (Array.isArray(sd.triggerWords)) haystacks.push(...sd.triggerWords);
        if (sd.modelNumber && sd.versionNumber) haystacks.push(`${sd.modelNumber}_${sd.versionNumber}`);
      }
      return haystacks.join(' ').toLowerCase().includes(term);
    });

    const dir = filtered.filter(i => i.isDirectory).sort(this.compareItems);
    const fil = filtered.filter(i => i.isFile).sort(this.compareItems);
    return [...dir, ...fil];
  }



  private getCreatedTime(stats: fs.Stats): Date {
    return stats.birthtime && stats.birthtime.getTime() > 0 ? stats.birthtime : stats.ctime;
  }


  applySearch(newTerm: string) {
    this.searchTerm = newTerm;
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.recomputeRenderItems();     // ← resets window to first page
    }, 250);
  }

  async openDirectory() {
    // If the current route is using the Virtual/DB data source, don't open OS picker.
    if (this.dataSource?.readOnly) {
      // optional: show a friendly note; or just return silently
      this.ngZone.run(() => {
        this.infoMessage = 'Virtual view is read-only. Use the path bar / navigation to browse.';
      });
      return;
    }

    // Filesystem mode (unchanged)
    const directoryPath = await this.electronService.openDirectoryDialog();
    if (directoryPath) {
      this.ngZone.run(() => {
        this.isLoading = true;
        this.errorMessage = null;
        this.infoMessage = null;
      });

      this.navigationService.navigateTo(directoryPath);
      // Calls the dispatcher you added; in FS mode it will delegate to loadFromFilesystem()
      this.loadDirectoryContents(directoryPath);
    } else {
      this.ngZone.run(() => {
        this.infoMessage = 'Directory selection was canceled.';
      });
    }
  }

  // 1) Your original logic, unchanged—just renamed.
  private async loadFromFilesystem(directoryPath: string) {
    try {
      // Read the directory asynchronously.
      const files = await fs.promises.readdir(directoryPath);

      // If the directory is empty, update the UI to show it is empty.
      if (files.length === 0) {
        this.ngZone.run(() => {
          this.selectedDirectory = directoryPath;                 // point UI at the empty folder
          this.directoryContents = [];
          this.selectedFile = null;                                // clear any previous selection/sidebars
          this.selectedFiles = [];
          this.contextFile = null;

          this.errorMessage = 'The selected directory is empty.';
          this.infoMessage = null;

          this.recomputeRenderItems();                             // <- ensure visibleItems becomes []
          this.isLoading = false;
        });
        return;
      }

      // Set the selected directory.
      this.ngZone.run(() => {
        this.selectedDirectory = directoryPath;
        this.errorMessage = null;
      });

      // Load recycle records.
      await this.recycleService.loadRecords();
      const recycleRecords = this.recycleService.getRecords();

      // Helper function to check if a file is marked as deleted.
      const isFileDeleted = (fullPath: string): boolean =>
        recycleRecords.some(record => record.files.includes(fullPath));

      if (!this.explorerState.enableCivitaiMode) {
        // Normal mode: Process all files with proper error handling.
        const fileItems = await Promise.all(
          files.map(async file => {
            const fullPath = path.join(directoryPath, file);
            try {
              const stats = await fs.promises.stat(fullPath);
              return {
                name: file,
                path: fullPath,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                isDeleted: isFileDeleted(fullPath),
                size: stats.isFile() ? stats.size : undefined,
                createdAt: this.getCreatedTime(stats),
                modifiedAt: stats.mtime
              } as DirectoryItem;
            } catch (statErr) {
              console.error(`Error stating file ${fullPath}:`, statErr);
              return null;
            }
          })
        );

        this.ngZone.run(() => {
          this.directoryContents = fileItems.filter(item => item !== null) as DirectoryItem[];
          this.isLoading = false;
          this.recomputeRenderItems();

        });
      } else {
        // Civitai Mode: Group files based on naming patterns.
        const directories: DirectoryItem[] = [];
        const groupMap = new Map<string, {
          allFiles: string[];
          previewPath?: string;
          totalSize: number;
          createdAt?: Date;
          modifiedAt?: Date;
        }>();

        // Process each file asynchronously.
        await Promise.all(
          files.map(async file => {
            const fullPath = path.join(directoryPath, file);
            try {
              const stats = await fs.promises.stat(fullPath);
              if (stats.isDirectory()) {
                directories.push({
                  name: file,
                  path: fullPath,
                  isFile: false,
                  isDirectory: true,
                  isDeleted: isFileDeleted(fullPath),
                  size: undefined,
                  createdAt: this.getCreatedTime(stats),
                  modifiedAt: stats.mtime
                });
              } else {
                // Get prefix based on naming convention (e.g., "123_456_SDXL_myModel")
                const prefix = this.getCivitaiPrefix(file);
                if (!prefix) return;
                if (!groupMap.has(prefix)) {
                  groupMap.set(prefix, { allFiles: [] as string[], totalSize: 0 });
                }
                const group = groupMap.get(prefix)!;
                group.allFiles.push(fullPath);
                group.totalSize += stats.size;

                const created = this.getCreatedTime(stats);
                const modified = stats.mtime;

                group.createdAt = group.createdAt ? (created < group.createdAt ? created : group.createdAt) : created;
                group.modifiedAt = group.modifiedAt ? (modified > group.modifiedAt ? modified : group.modifiedAt) : modified;

                // If this file is a preview image, record its path.
                if (file.endsWith('.preview.png')) {
                  groupMap.get(prefix)!.previewPath = fullPath;
                }
              }
            } catch (err) {
              console.error(`Error stating file ${fullPath}:`, err);
            }
          })
        );

        // Build grouped items only if a preview exists.
        const groupedItems: DirectoryItem[] = [];
        groupMap.forEach((group) => {
          if (group.previewPath) {
            groupedItems.push({
              name: path.basename(group.previewPath),
              path: group.previewPath,
              isFile: true,
              isDirectory: false,
              isDeleted: isFileDeleted(group.previewPath),
              civitaiGroup: group.allFiles,
              size: group.totalSize,
              createdAt: group.createdAt,
              modifiedAt: group.modifiedAt
            });
          }
        });

        this.ngZone.run(() => {
          // Combine directories and grouped items.
          this.directoryContents = [...directories, ...groupedItems];
          this.isLoading = false;
          this.recomputeRenderItems();
        });
      }

      if (this.directoryContents.length > 0) {
        this.updateLocalPath();
        this.scanLocalFiles();
        this.updateVisitedPath();
        this.fetchVisitedChildren();
      }

      console.log('Directory Contents:', this.directoryContents);
    } catch (err) {
      console.error('Error reading directory:', err);
      this.ngZone.run(() => {
        this.errorMessage = 'Failed to read the directory contents.';
        this.isLoading = false;
      });
    }
  }

  async loadDirectoryContents(directoryPath: string | null) {
    if (this.isReadOnly) {
      this.ngZone.run(() => {
        this.isLoading = true;
        this.errorMessage = null;
        this.infoMessage = null;
      });

      const pathToLoad = directoryPath ?? this.dataSource.initialPath ?? '\\';
      this.vPath = pathToLoad;
      this.vPage = 0;
      this.vTotalPages = 0;
      const sortKey = this.mapVirtualSortKey();

      this.dataSource.list(pathToLoad, {
        page: 0,
        size: this.vSize,
        sortKey,
        sortDir: this.sortDir
      }).subscribe({
        next: ({ items, selectedDirectory, page, totalPages }) => {
          this.ngZone.run(() => {
            this.selectedDirectory = selectedDirectory;
            this.directoryContents = items;
            this.isLoading = false;

            // build available drives
            const drives = new Set<string>();
            for (const it of items as any[]) {
              const d = this.normalizeDrive((it as any)?.drive);
              if (d) drives.add(d);
            }
            this.availableDrives = Array.from(drives).sort();

            this.vPage = page ?? 0;
            this.vTotalPages = totalPages ?? 0;

            this.recomputeRenderItems();
          });
        },
        error: (err) => {
          console.error('Virtual list() error:', err);
          this.ngZone.run(() => {
            this.errorMessage = 'Failed to load contents.';
            this.isLoading = false;
          });
        }
      });

      return;
    }

    // Otherwise, normal filesystem mode: use your original logic.
    if (!directoryPath) return;
    this.ngZone.run(() => {
      this.isLoading = true;
      this.errorMessage = null;
      this.infoMessage = null;
    });
    await this.loadFromFilesystem(directoryPath);
  }

  private normalizeDrive(v?: string | null): string | null {
    if (!v) return null;
    // UNC
    if (v.startsWith('\\\\')) return '\\\\';
    // Letter drive "F", "F:", "F:\..." -> normalize to "F"
    const m = v.match(/^([A-Za-z])/);
    return m ? m[1].toUpperCase() : null;
  }

  private extractDrive(p?: string): string | null {
    if (!p) return null;
    // "F:\...", "F:", or even just "F" -> "F"
    const m = p.match(/^([A-Za-z]):?/);
    if (m) return m[1].toUpperCase();

    if (p.startsWith('\\\\')) return '\\\\'; // UNC
    if (p.startsWith('/')) return '/';       // POSIX root (if you ever store these)
    return null;
  }

  updateLocalPath() {

    // Only perform the update if the flag is enabled
    if (!this.explorerState.updateLocalPathEnabled) {
      return;
    }

    // Disable explorer interactions until update finishes
    this.isPreloadComplete = true;

    // Use a Map to deduplicate file sets
    const fileSetMap = new Map<string, { modelID: string; versionID: string }>();

    this.directoryContents
      .filter(item => !item.isDirectory && item.name.includes('_'))
      .forEach(item => {
        const parts = item.name.split('_');
        if (parts.length >= 2) {
          const modelID = parts[0];
          const versionID = parts[1];
          const key = `${modelID}_${versionID}`;
          if (!fileSetMap.has(key)) {
            fileSetMap.set(key, { modelID, versionID });
          }
        }
      });

    const fileArray = Array.from(fileSetMap.values());

    // Build the request payload
    const requestBody = {
      fileArray: fileArray,
      localPath: this.selectedDirectory
    };

    // Call your API endpoint
    this.http.post('http://localhost:3000/api/update-local-path', requestBody)
      .subscribe({
        next: (response) => {
          console.log('Local path update successful:', response);
          this.isPreloadComplete = false;
          this.recomputeRenderItems();          // optional
          this.cdr.detectChanges();             // optional
        },
        error: (err) => {
          console.error('Error updating local path:', err);
          this.isPreloadComplete = false;
        }
      });
  }

  private updateVisitedPath(): void {
    if (!this.selectedDirectory) return;

    // Only perform the update if the flag is enabled
    if (!this.explorerState.updateLocalPathEnabled) {
      return;
    }

    const body = { path: this.selectedDirectory };
    this.http.post('http://localhost:3000/api/path-visited', body).subscribe({
      next: () => console.log('Visited path recorded:', body.path),
      error: (err) => console.error('Error recording visited path:', err)
    });
  }

  // tweak your existing fetchVisitedChildren()
  private fetchVisitedChildren(): void {
    const basePath = this.visitedBasePath ?? this.selectedDirectory;
    if (!basePath) return;

    if (!this.explorerState.updateLocalPathEnabled) {
      return;
    }


    const parentPath = basePath.replace(/\\/g, '/');
    this.http.post<any>('http://localhost:3000/api/get-visited-paths-children', { parentPath })
      .subscribe({
        next: (res) => {
          const rows: any[] = res?.payload?.payload ?? [];
          this.visitedSubdirs = rows.map(r => ({
            name: this.extractLeafDirName(r.path),
            path: r.path,
            lastAccessedAt: r.lastAccessedAt
          }));
        },
        error: (err) => console.error('get-visited-paths-children failed:', err)
      });
  }

  /**
 * Call the scan-local-files API.
 * Accepts a Map (or you could rebuild compositeList similarly) and sends the compositeList.
 */
  scanLocalFiles() {
    // Disable explorer interactions until scan completes
    // this.isPreloadComplete = true;

    // Use a Map to deduplicate file sets
    const fileSetMap = new Map<string, { modelID: string; versionID: string }>();

    // Populate fileSetMap with your file set data
    this.directoryContents
      .filter(item => !item.isDirectory && item.name.includes('_'))
      .forEach(item => {
        const parts = item.name.split('_');
        if (parts.length >= 2) {
          const modelID = parts[0];
          const versionID = parts[1];
          const key = `${modelID}_${versionID}`;
          if (!fileSetMap.has(key)) {
            fileSetMap.set(key, { modelID, versionID });
          }
        }
      });

    // Build the request payload with compositeList key
    const compositeList = Array.from(fileSetMap.values());
    const scanRequestBody = { compositeList };

    //Retrieve folder record by passing each modelID and versionID in the directory
    this.http.post('http://localhost:3000/api/scan-local-files', scanRequestBody)
      .subscribe({
        next: (response: any) => {
          console.log('Scan local files response:', response);
          const scannedData = response.payload?.modelsList ?? []; // fallback safe
          this.mergeScannedModelsIntoDirectoryContents(scannedData);

          // ✅ Rebuild the array the template actually uses
          this.recomputeRenderItems();
          this.isPreloadComplete = false;
          this.cdr.detectChanges(); // ensure the UI reflects new stats
        },
        error: (err) => {
          console.error('Error scanning local files:', err);
          this.isPreloadComplete = false;
        }
      });

  }

  mergeScannedModelsIntoDirectoryContents(scannedModels: any[]): void {
    // Index by "modelId_versionId" as strings to avoid 123 vs "123" mismatches
    const byKey = new Map<string, any>(
      scannedModels.map(s => [`${String(s.modelNumber)}_${String(s.versionNumber)}`, s])
    );

    this.directoryContents = this.directoryContents.map(item => {
      if (!item.isDirectory && item.name.includes('_')) {
        const [modelID, versionID] = item.name.split('_');
        const scanned = byKey.get(`${String(modelID)}_${String(versionID)}`);
        if (scanned) {
          // Keep the original item, attach scanData (don’t mutate in place)
          return { ...item, scanData: scanned };
        }
      }
      return item;
    });
  }



  /**
   * Utility function:
   * Check if filename matches {modelID}_{versionID}_{baseModel}_{name}.XXX
   * If matches, return the "prefix" (everything before final extension).
   * If not, return null.
   */
  private getCivitaiPrefix(filename: string): string | null {
    // Quick example:  123_456_SDXL_myModel.preview.png
    // We only want the portion "123_456_SDXL_myModel"
    // The pattern can be adjusted to be more or less strict
    const match = filename.match(/^(\d+)_(\d+)_[^_]+_.+?(?=\.)/);
    return match ? match[0] : null;
  }

  onBack() {
    const prevPath = this.navigationService.goBack();
    if (prevPath) {
      this.ngZone.run(() => {
        this.selectedDirectory = prevPath;
        this.isLoading = true;
      });
      this.loadDirectoryContents(prevPath);
    }
  }

  onForward() {
    const nextPath = this.navigationService.goForward();
    if (nextPath) {
      this.ngZone.run(() => {
        this.selectedDirectory = nextPath;
        this.isLoading = true;
      });
      this.loadDirectoryContents(nextPath);
    }
  }

  async onRefresh() {
    if (!this.selectedDirectory) return;

    this.ngZone.run(() => { this.isLoading = true; });
    const current = this.selectedDirectory;
    await this.loadDirectoryContents(this.selectedDirectory);

    // FS-only recovery: if the directory no longer exists, go up
    if (!this.isReadOnly) {
      try {
        // if path vanished (deleted/renamed), navigate to parent
        // (this does NOT trigger when the folder is merely empty)
        if (!fs.existsSync(current)) {
          const parentDir = path.dirname(current);
          if (parentDir && parentDir !== current) {
            this.selectedDirectory = parentDir;
            this.navigationService.navigateTo(parentDir);
            await this.loadDirectoryContents(parentDir);
          }
        }
      } catch (_) {
        // If fs check fails for some reason, quietly ignore.
      }
    }
  }


  setSort(key: 'name' | 'size' | 'modified' | 'created' | 'myRating') {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = key === 'name' ? 'asc' : 'desc';
    }
    this.sortSubmenuOpen = false;
    this.showEmptyAreaContextMenu = false;

    if (this.isReadOnly && this.selectedDirectory) {
      this.isLoading = true;
      const dirs = this.directoryContents.filter(x => x.isDirectory);
      this.directoryContents = [...dirs];
      this.vPage = 0;
      this.vTotalPages = 0;

      this.dataSource.list(this.selectedDirectory, {
        page: 0,
        size: this.vSize,
        sortKey: this.mapVirtualSortKey(),
        sortDir: this.sortDir
      }).subscribe({
        next: ({ items, page, totalPages }) => {
          const filesOnly = items.filter(i => i.isFile);
          this.directoryContents = [...dirs, ...filesOnly];
          this.vPage = page ?? 0;
          this.vTotalPages = totalPages ?? 0;
          this.isLoading = false;
          this.recomputeRenderItems();
        },
        error: () => { this.isLoading = false; }
      });
      return;
    }

    // FS mode: local sort
    this.recomputeRenderItems();
  }


  toggleSortDirection() {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    this.recomputeRenderItems();
  }

  onMouseEnterSortSubmenu(_: MouseEvent) {
    this.sortSubmenuOpen = true;
    setTimeout(() => {
      if (!this.sortSubmenuRef) return;
      const rect = this.sortSubmenuRef.nativeElement.getBoundingClientRect();
      this.sortSubmenuShouldFlip = rect.right > window.innerWidth;
    });
  }



  openSubDirectory(subDirPath: string) {
    this.ngZone.run(() => {
      this.isLoading = true;
      this.errorMessage = null;
      this.infoMessage = null;
    });
    this.navigationService.navigateTo(subDirPath);
    this.loadDirectoryContents(subDirPath);
  }

  navigateByPath(newPath: string) {
    if (this.isReadOnly) {            // if somehow called in Virtual, just delegate
      this.onVirtualPathChange(newPath);
      return;
    }

    if (!fs.existsSync(newPath)) {
      this.errorMessage = `Path does not exist: ${newPath}`;
      return;
    }
    const stats = fs.statSync(newPath);
    if (!stats.isDirectory()) {
      this.errorMessage = `Path is not a directory: ${newPath}`;
      return;
    }

    this.ngZone.run(() => {
      this.isLoading = true;
      this.errorMessage = null;
      this.infoMessage = null;
      this.directoryContents = [];
    });

    this.navigationService.navigateTo(newPath);
    this.loadDirectoryContents(newPath);
  }


  // ===============================
  // Handling Right-Click Logic
  // ===============================

  // 1) Called when user right-clicks empty area
  onEmptyAreaRightClick(event: MouseEvent) {
    event.preventDefault();
    this.selectedFile = null; // no file
    this.positionContextMenu(event.clientX, event.clientY);
    this.showEmptyAreaContextMenu = true;
    this.showFileContextMenu = false;
  }

  onSingleClick(file: DirectoryItem) {
    console.log('Parent sees single-click:', file.name);
    // Only set the selectedFile if it is a file (not a folder)
    if (file.isFile) {
      this.selectedFile = file;
    } else {
      // Optionally clear the selection if a folder is clicked
      this.selectedFile = null;
    }
  }

  // 2) Called when user right-clicks a file
  onFileRightClick(file: DirectoryItem, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    // Do NOT update selectedFile here
    this.contextFile = file; // store for context menu actions only
    this.positionContextMenu(event.clientX, event.clientY);
    this.showFileContextMenu = true;
    this.showEmptyAreaContextMenu = false;
  }

  // Positions the context menu so it won't overflow
  positionContextMenu(x: number, y: number) {
    const menuWidth = 200;
    const menuHeight = 250;
    const maxX = window.innerWidth;
    const maxY = window.innerHeight;

    let newX = x;
    let newY = y;
    if (newX + menuWidth > maxX) {
      newX = maxX - menuWidth;
    }
    if (newY + menuHeight > maxY) {
      newY = maxY - menuHeight;
    }

    this.menuX = newX;
    this.menuY = newY;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Hide context menus and submenus
    this.showEmptyAreaContextMenu = false;
    this.showFileContextMenu = false;
    this.viewSubmenuOpen = false;
    this.sortSubmenuOpen = false;

    const target = event.target as HTMLElement;
    // Only clear the selection if the click is NOT on a file item, the left sidebar (.sidebar), 
    // or the update sidebar (.update-sidebar)
    if (!target.closest('.file-item') &&
      !target.closest('.sidebar') &&
      !target.closest('.update-sidebar')) {
      this.selectedFile = null;
    }
  }

  @ViewChild('fileList') fileListComponent!: FileListComponent;

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    // Skip if focus is in an input, textarea, or an editable element.
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    // Process only single-character keys (letters/digits)
    if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
      // Append the key (in lowercase) to our type-ahead buffer.
      this.typeaheadBuffer += event.key.toLowerCase();

      // Reset the timer
      if (this.typeaheadTimer) {
        clearTimeout(this.typeaheadTimer);
      }
      this.typeaheadTimer = setTimeout(() => {
        this.typeaheadBuffer = '';
      }, this.typeaheadTimeout);

      // Forward the buffer to the file list component so it can update the selection.
      if (this.fileListComponent) {
        this.fileListComponent.selectItemByPrefix(this.typeaheadBuffer);
      }
    }
  }

  onMenuClick(event: MouseEvent) {
    event.stopPropagation();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Save the current scroll position
    this.scrollState.homeScrollPosition = window.scrollY;
    console.log('Updated window.scrollY to', this.scrollState.homeScrollPosition);

    // Hide context menus (existing functionality)
    this.showFileContextMenu = false;
    this.showEmptyAreaContextMenu = false;
  }



  // ================ Empty-Area Menu Items ================
  @ViewChild('viewSubmenu') viewSubmenuRef!: ElementRef<HTMLDivElement>;

  onMouseEnterViewSubmenu(event: MouseEvent) {
    this.viewSubmenuOpen = true;

    setTimeout(() => {
      if (!this.viewSubmenuRef) return;
      const submenuEl = this.viewSubmenuRef.nativeElement;
      const rect = submenuEl.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this.viewSubmenuShouldFlip = true;
      } else {
        this.viewSubmenuShouldFlip = false;
      }
    });
  }

  switchView(mode: string) {
    this.showEmptyAreaContextMenu = false;
    this.viewSubmenuOpen = false;

    // If you store viewMode in ExplorerStateService:
    this.explorerState.viewMode = mode as any;

    // Or if you have a set method
    // this.explorerState.saveViewMode(mode);

    console.log('Switched view to:', mode);
  }


  sortBy(type: string) {
    this.showEmptyAreaContextMenu = false;
    this.sortSubmenuOpen = false;
    console.log('Sorting by: ', type);
    // implement sorting if needed
  }

  refresh() {
    this.showEmptyAreaContextMenu = false;
    console.log('Refresh triggered');
    if (this.selectedDirectory) {
      this.onRefresh();
    }
  }

  newItem() {
    this.showEmptyAreaContextMenu = false;
    console.log('Create a new file/folder');
  }

  showProperties() {
    this.showEmptyAreaContextMenu = false;
    console.log('Show properties (file or empty area?).');
    // If you want different logic for file vs. empty, handle that
  }

  // =============== File-Based Menu Items =================
  cutFile() {
    this.showFileContextMenu = false;
    // Use selectedFiles if available; otherwise, use contextFile.
    const filesToCut: DirectoryItem[] =
      (this.selectedFiles && this.selectedFiles.length > 0)
        ? this.selectedFiles
        : (this.contextFile ? [this.contextFile] : []);
    if (filesToCut.length === 0) return;

    // Do not allow cut if any file is marked as deleted.
    if (filesToCut.some(file => file.isDeleted)) {
      console.warn('Cannot cut deleted files.');
      return;
    }

    this.clipboard = { type: 'cut', items: filesToCut };
    console.log(
      filesToCut.length > 1
        ? `[CivitaiMode] Cutting multiple files: ${filesToCut.map(f => f.name).join(', ')}`
        : `Cut file: ${filesToCut[0].name}`
    );
  }

  copyFile() {
    this.showFileContextMenu = false;
    const filesToCopy: DirectoryItem[] =
      (this.selectedFiles && this.selectedFiles.length > 0)
        ? this.selectedFiles
        : (this.contextFile ? [this.contextFile] : []);
    if (filesToCopy.length === 0) return;

    if (filesToCopy.some(file => file.isDeleted)) {
      console.warn('Cannot copy deleted files.');
      return;
    }

    this.clipboard = { type: 'copy', items: filesToCopy };
    console.log(
      filesToCopy.length > 1
        ? `[CivitaiMode] Copying multiple files: ${filesToCopy.map(f => f.name).join(', ')}`
        : `Copy file: ${filesToCopy[0].name}`
    );
  }

  hasDeletedFiles(): boolean {
    // Check selectedFiles if available, otherwise check contextFile.
    const files = (this.selectedFiles && this.selectedFiles.length > 0)
      ? this.selectedFiles
      : (this.contextFile ? [this.contextFile] : []);
    return files.some(f => f.isDeleted);
  }

  pasteFiles() {

    this.showEmptyAreaContextMenu = false;

    if (!this.clipboard) {
      console.warn('Clipboard is empty.');
      return;
    }
    if (!this.selectedDirectory) {
      console.warn('No target directory selected.');
      return;
    }
    const targetDir = this.selectedDirectory;
    const operations: Promise<any>[] = [];

    const processFile = (sourcePath: string) => {
      const baseName = path.basename(sourcePath);
      let newPath = path.join(targetDir, baseName);

      // Check if a file with the same name exists
      if (fs.existsSync(newPath)) {
        if (this.clipboard!.type === 'cut') {
          if (!confirm(`A file named "${baseName}" already exists. Do you want to replace it?`)) {
            console.log(`User canceled replacing "${baseName}".`);
            return; // Skip this file
          }
        } else if (this.clipboard!.type === 'copy') {
          newPath = this.getUniqueFilePath(newPath);
        }
      }

      if (this.clipboard!.type === 'cut') {
        operations.push(
          fs.promises.rename(sourcePath, newPath)
            .then(() => console.log(`Moved "${baseName}" to "${newPath}"`))
            .catch(err => console.error(`Error moving "${baseName}":`, err))
        );
      } else if (this.clipboard!.type === 'copy') {
        operations.push(
          fs.promises.copyFile(sourcePath, newPath)
            .then(() => console.log(`Copied "${baseName}" to "${newPath}"`))
            .catch(err => console.error(`Error copying "${baseName}":`, err))
        );
      }
    };

    // Process each item in the clipboard
    this.clipboard.items.forEach(file => {
      if (file.civitaiGroup && file.civitaiGroup.length > 0) {
        file.civitaiGroup.forEach(groupFilePath => {
          processFile(groupFilePath);
        });
      } else {
        processFile(file.path);
      }
    });

    // Wait for all file operations to complete before refreshing the view.
    Promise.all(operations)
      .then(() => {
        if (this.clipboard!.type === 'cut') {
          this.clipboard = null;
        }
        this.onRefresh();
      })
      .catch(err => console.error('Error during paste operations:', err));
  }


  // Helper method to generate a unique file name for copy operations
  private getUniqueFilePath(filePath: string): string {
    let counter = 1;
    const parsed = path.parse(filePath);
    let baseName = parsed.name; // e.g. "993527_1406404_Illustrious_V2_Mud_Quicksand_Illustrious.preview"
    let specialSuffix = "";

    // Check if the baseName ends with ".preview"
    if (baseName.endsWith(".preview")) {
      // Remove the ".preview" part from baseName and store it in specialSuffix.
      baseName = baseName.slice(0, -".preview".length);
      specialSuffix = ".preview";
    }

    let newFilePath = filePath;

    // Loop until we find a file name that doesn't exist.
    while (fs.existsSync(newFilePath)) {
      if (specialSuffix) {
        newFilePath = path.join(parsed.dir, `${baseName} (${counter})${specialSuffix}${parsed.ext}`);
      } else {
        newFilePath = path.join(parsed.dir, `${parsed.name} (${counter})${parsed.ext}`);
      }
      counter++;
    }

    return newFilePath;
  }



  async deleteFiles() {
    this.showFileContextMenu = false;

    const filesToDelete: DirectoryItem[] =
      (this.selectedFiles && this.selectedFiles.length > 0)
        ? this.selectedFiles
        : (this.contextFile ? [this.contextFile] : []);

    if (filesToDelete.length === 0) return;

    if (!this.recycleService.arePathsSet) {
      console.warn('Recycle paths are not set. Please set up the recycle path in Preferences.');
      return;
    }

    // create records one-by-one (await each)
    for (const file of filesToDelete) {
      const recordType: 'set' | 'directory' = file.isFile ? 'set' : 'directory';
      const record: RecycleRecord = {
        type: recordType,
        originalPath: file.path,
        files: (file.civitaiGroup && file.civitaiGroup.length) ? file.civitaiGroup : [file.path],
        deletedFromPath: this.selectedDirectory || null,
        deletedDate: new Date()
      };

      await this.recycleService.addRecord(record);
    }

    // Clear selections.
    this.selectedFiles = [];
    this.selectedFile = null;
    this.contextFile = null;

    // Refresh the current directory to update deletion status.
    if (this.selectedDirectory) {
      await this.onRefresh(); // optional await
    }
  }

  async restoreFiles() {
    this.showFileContextMenu = false;

    const filesToRestore: DirectoryItem[] =
      (this.selectedFiles && this.selectedFiles.length > 0)
        ? this.selectedFiles
        : (this.contextFile ? [this.contextFile] : []);

    if (filesToRestore.length === 0) return;

    const filePaths = filesToRestore.map(file => file.path);

    // ⬅️ wait for the server to remove recycle rows
    await this.recycleService.restoreFiles(filePaths);

    // clear selections
    this.selectedFiles = [];
    this.selectedFile = null;
    this.contextFile = null;

    // ⬅️ now refresh; Home.loadFromFilesystem() will re-pull recycle list
    if (this.selectedDirectory) {
      await this.onRefresh();
    }
  }


  renameFile() {
    this.showFileContextMenu = false;
    if (!this.selectedFile) return;

    if (this.selectedFile.civitaiGroup) {
      console.log('[CivitaiMode] Renaming entire set:', this.selectedFile.civitaiGroup);
      // For now, just console.log
      // Real logic might ask user for new name & rename all files accordingly
    } else {
      console.log('Rename file:', this.selectedFile.name);
    }
  }

  // This method is called when the selection changes in the file list.
  onSelectionChanged(selected: DirectoryItem[]) {
    this.selectedFiles = selected;
    // Show the sidebar only if exactly one file is selected and it is a file (not a folder).
    if (selected.length === 1 && selected[0].isFile) {
      this.selectedFile = selected[0];
    } else {
      this.selectedFile = null;
    }

    // Trigger scroll after the sidebar animation completes.
    setTimeout(() => {
      if (this.fileListComponent) {
        this.fileListComponent.scrollToSelected();
      }
    }, 300); // Adjust delay if sidebar animation duration is different

  }

  // Method called from context menu "Update" option:
  openUpdateSidebar() {
    // Hide any file context menu
    this.showFileContextMenu = false;

    // Use contextFile (set during right-click) if available,
    // otherwise use the selectedFile
    const fileToUpdate = this.contextFile || this.selectedFile;
    if (fileToUpdate) {
      this.updateFile = fileToUpdate;
      this.showUpdateSidebar = true;
    } else {
      console.warn('No file selected to update.');
    }
  }

  // (Optional) If you want to close the update sidebar programmatically:
  closeUpdateSidebar() {
    this.showUpdateSidebar = false;
    this.updateFile = null;
  }

  // Called when the sidebar emits the full model data
  openModalFromSidebar(modelVersion: any) {
    this.selectedModelVersion = modelVersion;
  }

  closeModal() {
    this.selectedModelVersion = null;
  }

  // Toggle method triggered by the toolbar's event
  toggleZipSidebar(): void {
    this.showZipSidebar = !this.showZipSidebar;
  }

  closeZipSidebar(): void {
    this.showZipSidebar = false;
  }

  // Called when the zip sidebar emits a selection event.
  handleSelectUnzippedSets(selectedItems: DirectoryItem[]): void {
    console.log('Selected unzipped sets:', selectedItems);
    // Update HomeComponent's selectedFiles property.
    this.selectedFiles = selectedItems;
    // Update the file list component's internal selection so that items are highlighted.
    if (this.fileListComponent) {
      this.fileListComponent.selectedItems = selectedItems;
      // If your file list component uses an output event to signal selection change,
      // you might also emit that event:
      // this.fileListComponent.selectionChanged.emit(selectedItems);
    }
    // Optionally hide the sidebar.
  }

  // Import shell if needed (depending on your electronService implementation)
  // import { shell } from 'electron';

  openNativeFileExplorer(): void {
    if (this.isReadOnly) return; // hidden by template anyway, but belt+suspenders
    this.showEmptyAreaContextMenu = false;
    if (this.selectedDirectory) {
      shell.openPath(this.selectedDirectory)
        .then(result => {
          if (result) {
            console.error('Error opening file explorer:', result);
          }
        })
        .catch(err => console.error('Error invoking openPath:', err));
    } else {
      console.warn('No directory selected.');
    }
  }

  async updateAllModels(): Promise<void> {
    this.isUpdatingAllModels = true;
    this.currentUpdateModel = 'Starting update...';

    // Pick items that we can extract IDs from (works for FS & Virtual)
    const items = this.directoryContents.filter(it => !!this.extractIdsFromItem(it));

    for (const item of items) {
      const ids = this.extractIdsFromItem(item);
      if (!ids) continue;

      this.currentUpdateModel = item.name ?? `${ids.modelId}_${ids.versionId}`;

      try {
        // 1) Pull fresh stats from Civitai
        const civitaiUrl = `https://civitai.com/api/v1/model-versions/${ids.versionId}`;
        const modelVersion = await lastValueFrom(this.http.get<any>(civitaiUrl));

        // 2) Update your local DB
        const payload = {
          modelId: ids.modelId,
          versionId: ids.versionId,
          fieldsToUpdate: ['stats'],
          stats: modelVersion?.stats
        };
        await lastValueFrom(
          this.http.post('http://localhost:3000/api/update-record-by-model-and-version', payload)
        );

        // 3) Update in-memory item (if you want the UI to reflect immediately)
        (item as any).scanData = { ...(item as any).scanData };
        (item as any).scanData.statsParsed = modelVersion?.stats ?? {};
        // (optional) also keep string if your backend expects it somewhere else:
        (item as any).scanData.stats = JSON.stringify(modelVersion?.stats ?? {});
        this.cdr.markForCheck(); // OnPush: reflect the new numbers immediately

      } catch (err) {
        console.error(`Error updating ${this.currentUpdateModel}:`, err);
      }

      // Gentle pacing
      await new Promise(res => setTimeout(res, 2000));
    }

    this.isUpdatingAllModels = false;
    this.currentUpdateModel = '';
  }


  /** in home.component.ts */
  async openSubDirectoryWithoutHistory(path: string) {
    // exactly as in your prev implementation—
    // loadDirectoryContents(path) but do NOT push into back/forward history
    this.isLoading = true;
    await this.loadDirectoryContents(path);
    this.isLoading = false;
  }

  private naturalNameCompare(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  private compareItems = (a: DirectoryItem, b: DirectoryItem): number => {
    let cmp = 0;

    switch (this.sortKey) {
      case 'name':
        cmp = this.naturalNameCompare(a.name, b.name);
        break;
      case 'size': {
        const asize = a.size ?? -1;  // treat unknown as smaller
        const bsize = b.size ?? -1;
        cmp = asize - bsize;
        break;
      }
      case 'modified': {
        const at = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
        const bt = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
        cmp = at - bt;
        break;
      }
      case 'created': {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = at - bt;
        break;
      }
      case 'myRating': {
        const ar = this.getItemMyRating(a);
        const br = this.getItemMyRating(b);

        // Optional: always push unrated (-1) to the bottom regardless of direction
        if (ar === -1 && br !== -1) return 1;
        if (br === -1 && ar !== -1) return -1;

        cmp = ar - br;
        break;
      }
    }

    return this.sortDir === 'asc' ? cmp : -cmp;
  };


  applyVirtualSearch(query: string) {
    this.searchTerm = query || '';
    // If you want advanced DB-style filtering (e.g., scanData), you can extend
    // your getter filteredDirectoryContents to check scanData when isReadOnly is true.
  }

  onVirtualPathChange(newPath: string) {
    // No fs.existsSync checks here — DB path is a logical path
    if (!newPath.endsWith('\\')) newPath += '\\';
    this.navigationService.navigateTo(newPath);
    this.loadDirectoryContents(newPath);
  }

  onVirtualDriveChange(drive: string) {
    this.selectedDrive = drive || 'all';
    this.recomputeRenderItems();
  }


  // Add this helper inside HomeComponent
  private extractIdsFromItem(item: DirectoryItem): { modelId: string; versionId: string } | null {
    // FS mode: parse from filename like "123_456_..."
    if (!this.isReadOnly) {
      const parts = item.name?.split('_') || [];
      if (parts.length >= 2) return { modelId: parts[0], versionId: parts[1] };
      return null;
    }

    // Virtual mode: use data from scanData or model
    const anyItem: any = item as any;
    const sd = anyItem.scanData || {};
    const modelId =
      sd.modelNumber ??
      anyItem.modelNumber ??
      anyItem.model?.modelNumber ??
      null;

    const versionId =
      sd.versionNumber ??
      anyItem.versionNumber ??
      anyItem.model?.versionNumber ??
      null;

    if (modelId && versionId) return { modelId: String(modelId), versionId: String(versionId) };
    return null;
  }

  get totalFilesCount(): number {
    const list = this.directoryContents ?? [];
    return list.reduce((n, it) => n + (it.isFile ? 1 : 0), 0);
  }
  get totalDirsCount(): number {
    const list = this.directoryContents ?? [];
    return list.reduce((n, it) => n + (it.isDirectory ? 1 : 0), 0);
  }
  /** visible (after your drive/search/sort filters) */
  get visibleFilesCount(): number {
    const list = this.renderItems ?? [];
    return list.reduce((n, it) => n + (it.isFile ? 1 : 0), 0);
  }

  private getItemMyRating(it: DirectoryItem): number {
    const anyIt: any = it as any;
    const v = anyIt?.scanData?.myRating ?? anyIt?.model?.myRating ?? anyIt?.myRating;
    const n = Number(v);
    return Number.isFinite(n) ? n : -1; // -1 = unrated
  }


  @HostListener('window:resize')
  @HostListener('window:scroll')
  onWinChange() { this.syncStatusBar(); }

  private syncStatusBar() {
    const col = this.listColumnRef?.nativeElement;
    const bar = this.statusBarRef?.nativeElement;
    if (!col || !bar) return;

    const r = col.getBoundingClientRect();

    // Size/position the bar to the middle column
    bar.style.left = `${Math.max(0, r.left)}px`;
    bar.style.width = `${Math.max(0, r.width)}px`;

    // Show only when the column is onscreen
    const isVisible = r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
    bar.style.display = isVisible ? 'flex' : 'none';
  }

  // HomeComponent (private helpers)
  private extractLeafDirName(p: string): string {
    if (!p) return '';
    // strip drive letter like "F:" or "G:" and normalize to '/'
    const noDrive = p.replace(/^[A-Za-z]:/, '');
    const normalized = noDrive.replace(/\\/g, '/').replace(/\/+$/, '');
    const parts = normalized.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : normalized;
  }

  onDeepSearch(raw: string) {
    const tagList = (raw || '').split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    if (!tagList.length) { this.clearDeepSearch(); return; }

    this.isLoading = true;
    this.http.post<any>(
      'http://localhost:3000/api/find-list-of-models-dto-from-all-table-by-tagsList-tampermonkey',
      { tagsList: tagList }
    ).subscribe({
      next: (res) => {
        const list: any[] = res?.payload?.modelsList ?? [];
        this.deepSearchItems = list.map(dto => this.mapDeepDtoToDirectoryItem(dto));
        this.deepSearchActive = true;

        // ✅ Feed the virtualization pipeline
        this.recomputeRenderItems();     // this will set renderItems and reset window
        this.isLoading = false;
      },
      error: (err) => { console.error('Deep search failed:', err); this.isLoading = false; }
    });
  }

  clearDeepSearch() {
    this.deepSearchActive = false;
    this.deepSearchItems = [];
    this.recomputeRenderItems();         // ✅ go back to normal windowed list
  }


  /** Normalize API DTO into the shape the file list expects in Virtual mode */
  private mapDeepDtoToDirectoryItem(dto: any): DirectoryItem {
    const modelId = String(dto?.modelNumber ?? dto?.modelId ?? dto?.modelID ?? '');
    const versionId = String(dto?.versionNumber ?? dto?.versionId ?? dto?.versionID ?? '');
    const baseModel = dto?.baseModel ?? dto?.modelBase ?? '';
    const mainName = dto?.mainModelName ?? dto?.name ?? dto?.modelName ?? '';

    const name = [modelId, versionId, baseModel, mainName].filter(Boolean).join('_');
    const logicalPath = `\\DEEP\\${modelId || 'M'}_${versionId || 'V'}\\${(mainName || 'model')}`;

    // Normalize image urls into scanData.imageUrls (array of strings)
    let imageUrls: any = dto?.imageUrls ?? dto?.images?.imageUrls ?? dto?.images ?? null;
    if (typeof imageUrls === 'string') {
      try { imageUrls = JSON.parse(imageUrls); } catch { imageUrls = null; }
    }
    if (Array.isArray(imageUrls)) {
      imageUrls = imageUrls.map((u: any) => (typeof u === 'string' ? u : u?.url)).filter(Boolean);
    }

    const item: DirectoryItem = {
      name,
      path: logicalPath,          // just needs to be unique/stable for trackBy and selection
      isFile: true,
      isDirectory: false,
      isDeleted: false
    } as any;

    // The file list already knows how to read thumbnails/stats/etc from scanData
    (item as any).scanData = {
      ...dto,
      modelNumber: modelId || dto?.modelNumber,
      versionNumber: versionId || dto?.versionNumber,
      baseModel,
      mainModelName: mainName,
      imageUrls
    };

    return item;
  }

  onMyRatingChanged() {
    if (this.sortKey === 'myRating') {
      this.recomputeRenderItems();   // re-sorts and updates the windowed list
    }
  }


  private mapVirtualSortKey(): 'name' | 'created' | 'modified' | 'myRating' {
    switch (this.sortKey) {
      case 'created': return 'created';
      case 'modified': return 'modified';
      case 'myRating': return 'myRating';
      default: return 'name'; // 'size' not supported in Virtual
    }
  }

  private fetchNextVirtualPage() {
    if (!this.vPath || this.vLoading) return;
    if (this.vTotalPages && (this.vPage + 1) >= this.vTotalPages) return;

    this.vLoading = true;
    const sortKey = this.mapVirtualSortKey();
    console.log('[Virtual] loading page', this.vPage + 1, 'size', this.vSize, 'sort', sortKey, this.sortDir);

    this.dataSource.list(this.vPath, {
      page: this.vPage + 1,
      size: this.vSize,
      sortKey,
      sortDir: this.sortDir
    }).subscribe({
      next: ({ items, page, totalPages }) => {
        const filesOnly = (items ?? []).filter(i => i.isFile);
        console.log('[Virtual] received page', page, 'files', filesOnly.length, 'totalPages', totalPages);

        this.directoryContents = [...this.directoryContents, ...filesOnly];
        this.vPage = page ?? (this.vPage + 1);
        this.vTotalPages = totalPages ?? this.vTotalPages;

        this.vLoading = false;
        this.recomputeRenderItems();
      },
      error: (err) => {
        console.error('Virtual next page error:', err);
        this.vLoading = false;
      }
    });
  }


}