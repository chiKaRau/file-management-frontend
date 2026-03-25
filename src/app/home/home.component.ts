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
import { Subscription, firstValueFrom, lastValueFrom } from 'rxjs';
import { HomeRefreshService } from './services/home-refresh.service';
import { PreferencesService } from '../preferences/preferences.service';
import { FileListComponent, UpdateBatchActionPlanItem } from './components/file-list/file-list.component';
import { HttpClient } from '@angular/common/http';
import { shell } from 'electron';
import { DATA_SOURCE } from '../shared/data-sources/DATA_SOURCE';
import { ExplorerDataSource } from '../shared/data-sources/data-source';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { SearchService } from './services/search.service';

type ViewMode = 'extraLarge' | 'large' | 'medium' | 'small' | 'list' | 'details';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class HomeComponent implements OnInit, AfterViewInit {
  private readonly updateFolderName = 'update';

  // Search filter
  searchTerm = '';

  updateMode = false;

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

  private readonly FS_LOAD_BATCH_SIZE = 200;
  private readonly FS_SYNC_BATCH_SIZE = 150;
  private readonly FS_UI_FLUSH_EVERY = 2;

  private currentFsLoadToken = 0;
  private activeFsSyncQueue: Promise<void> = Promise.resolve();
  private syncedFsKeys = new Set<string>();

  isFsListingInProgress = false;
  isFsBackgroundSyncInProgress = false;
  fsLoadedCount = 0;
  fsTotalCount = 0;
  fsSyncedCount = 0;
  fsSyncTotalCount = 0;
  fsPhaseMessage = '';

  // Add a property to store the scan result if needed:
  scannedModels: any[] = [];

  renderItems: DirectoryItem[] = [];

  visitedSubdirs: { name: string; path: string; lastAccessedAt?: string }[] = [];

  // field near other state
  visitedBasePath: string | null = null;

  deepSearchActive = false;
  deepSearchItems: DirectoryItem[] = [];
  updateSearchResultBySourcePath: Record<string, DirectoryItem[]> = {};
  searchingUpdateSelections = false;

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

  sortKey: 'name' | 'size' | 'modified' | 'created' | 'myRating' | 'modelNumber' | 'versionNumber' = 'name';
  sortDir: 'asc' | 'desc' = 'asc';

  // home.component.ts (top-level fields)
  public get isReadOnly(): boolean { return !!this.dataSource?.readOnly; }

  availableDrives: string[] = [];
  selectedDrive: string = 'all';
  groupingMode = false; // if you want the toggle wire-up

  private vQuery: string = ''; // 👈 remember current virtual search term


  // add near other ViewChilds
  @ViewChild('scrollRoot') scrollRootRef!: ElementRef<HTMLElement>;

  private vPath: string | null = null;
  private vPage = 0;
  private vSize = 100;
  private vTotalPages = 0;
  private vLoading = false;

  private vTotalElements = 0;   // total files in this virtual path (from server)
  private vDirCount = 0;        // directories for this path (we fetch all on page 0)

  filesViewMode: ViewMode = this.explorerState.filesViewMode ?? this.explorerState.viewMode ?? 'large';
  foldersViewMode: ViewMode = this.explorerState.foldersViewMode ?? 'large';

  // context-menu submenus (if you split into "View files as >" / "View folders as >")
  fileViewSubmenuOpen = false;
  fileViewSubmenuShouldFlip = false;
  dirViewSubmenuOpen = false;
  dirViewSubmenuShouldFlip = false;

  @ViewChild('fileViewSubmenu') fileViewSubmenuRef!: ElementRef<HTMLDivElement>;
  @ViewChild('dirViewSubmenu') dirViewSubmenuRef!: ElementRef<HTMLDivElement>;

  updateSearchCurrentItemName: string = '';
  updateSearchProcessedCount: number = 0;
  updateSearchTotalCount: number = 0;


  constructor(
    private electronService: ElectronService,
    private scrollState: ScrollStateService,
    private homeRefreshService: HomeRefreshService,
    private ngZone: NgZone,
    public navigationService: NavigationService,
    public explorerState: ExplorerStateService,
    public recycleService: RecycleService,
    public searchService: SearchService,
    public preferencesService: PreferencesService,
    private http: HttpClient,
    @Inject(DATA_SOURCE) public dataSource: ExplorerDataSource,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  private isUpdateModeActive(): boolean {
    return this.router.url.startsWith('/update') || !!this.route.snapshot.data?.['updateMode'];
  }

  ngOnInit() {
    this.updateMode = this.isUpdateModeActive();

    if (this.preferencesService.storageDir && this.preferencesService.deleteDir) {
      this.recycleService.setPaths(this.preferencesService.storageDir, this.preferencesService.deleteDir);
    }

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
      this.navigationService.setContext(this.isUpdateModeActive() ? 'update' : 'fs');

      if (this.isUpdateModeActive()) {
        // Update tab uses card view, but one card per row.
        this.filesViewMode = 'extraLarge';
        this.foldersViewMode = 'extraLarge';

        // Preserve prior Update selection when returning to the Update tab.
        const existingUpdatePath = this.explorerState.updateSelectedDirectory;
        const hasExistingUpdateContents = (this.explorerState.updateDirectoryContents?.length ?? 0) > 0;

        if (existingUpdatePath && this.isValidUpdateDirectory(existingUpdatePath)) {
          this.selectedDirectory = existingUpdatePath;
          this.infoMessage = null;
          this.errorMessage = null;
          this.isLoading = false;

          // If we have a path but no cached items (e.g. cold reload), fetch now.
          if (!hasExistingUpdateContents) {
            this.loadDirectoryContents(existingUpdatePath);
          }
        } else {
          // First time: start empty until user explicitly selects an Update directory.
          this.selectedDirectory = null;
          this.directoryContents = [];
          this.errorMessage = null;
          this.infoMessage = 'Select an Update directory to begin.';
          this.isLoading = false;
        }

        this.showUpdateSidebar = this.isUpdateModeActive();
      }

      // If we already have an FS folder loaded, do nothing (preserve it).
      // Otherwise wait for user to choose a folder as before.
    }
  }

  private isValidUpdateDirectory(dirPath?: string | null): boolean {
    if (!dirPath) return false;
    return dirPath
      .split(/[\\/]+/)
      .some(part => part.toLowerCase() === this.updateFolderName);
  }

  private showUpdateDirectoryError(): void {
    this.errorMessage = 'Selected path must be inside an Update directory.';
    this.infoMessage = null;
    this.isLoading = false;
  }

  private shouldShowUpdateTabSidebar(): boolean {
    return this.isUpdateModeActive()
      && this.preferencesService.scanVerified
      && this.recycleService.arePathsSet;
  }

  get updateTabReady(): boolean {
    return this.shouldShowUpdateTabSidebar();
  }


  private readonly PAGE_SIZE = 100;    // tune 100–400
  visibleCount = this.PAGE_SIZE;
  private io?: IntersectionObserver;

  get visibleItems(): DirectoryItem[] {
    return this.renderItems.slice(0, this.visibleCount);
  }

  private resetWindow() {
    if (this.isReadOnly) {
      this.visibleCount = this.renderItems.length;
      return;
    }

    if (!this.renderItems.length) {
      this.visibleCount = this.PAGE_SIZE;
      return;
    }

    this.visibleCount = Math.min(
      Math.max(this.visibleCount, this.PAGE_SIZE),
      this.renderItems.length
    );
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

    const rawQ = this.searchTerm || '';
    const hasField = this.hasFieldSyntax(rawQ);
    const free = this.extractFreeText(rawQ).toLowerCase(); // <- only free text for client filtering

    // source
    let contents = this.deepSearchActive ? (this.deepSearchItems ?? []) : (this.directoryContents ?? []);

    if (!this.deepSearchActive) {
      // drive filter
      if (isVirtual && drive !== 'all') {
        contents = contents.filter((it: any) => this.normalizeDrive(it?.drive) === this.normalizeDrive(drive));
      }

      // only apply client-side filter when there IS free text
      // (and not when it's purely fielded like mainModelName:"...")
      const shouldClientFilter = !!free;

      contents = shouldClientFilter
        ? contents.filter((item: any) => {
          // if (item._searchText) return item._searchText.includes(free);
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
          return item._searchText.includes(free);
        })
        : contents;

      // IMPORTANT: for Virtual + fielded queries, trust server for files
      // but only keep directories that match by name/localPath/name field
      if (isVirtual && hasField) {
        contents = contents.filter((it: any) => !it?.isDirectory || this.directoryMatches(it, rawQ));
      }
    }

    const dirs = contents.filter(i => i.isDirectory).sort(this.compareItems);
    const files = contents.filter(i => i.isFile).sort(this.compareItems);

    this.renderItems = [...dirs, ...files];
    this.resetWindow();
    this.cdr.markForCheck();
  }



  // handler wired from toolbar
  onLockContextChange(e: { locked: boolean; basePath: string | null }) {
    this.visitedBasePath = e.locked ? e.basePath : null;
    this.fetchVisitedChildren();   // refresh with the anchored parent
  }



  get selectedDirectory(): string | null {
    if (this.isUpdateModeActive()) {
      return this.explorerState.updateSelectedDirectory;
    }

    return this.isReadOnly
      ? this.explorerState.virtualSelectedDirectory
      : this.explorerState.fsSelectedDirectory;
  }
  set selectedDirectory(val: string | null) {
    if (this.isUpdateModeActive()) {
      this.explorerState.updateSelectedDirectory = val;
      return;
    }

    if (this.isReadOnly) {
      this.explorerState.virtualSelectedDirectory = val;
    } else {
      this.explorerState.fsSelectedDirectory = val;
    }
  }

  get directoryContents(): DirectoryItem[] {
    if (this.isUpdateModeActive()) {
      return this.explorerState.updateDirectoryContents;
    }

    return this.isReadOnly
      ? this.explorerState.virtualDirectoryContents
      : this.explorerState.fsDirectoryContents;
  }
  set directoryContents(val: DirectoryItem[]) {
    if (this.isUpdateModeActive()) {
      this.explorerState.updateDirectoryContents = val;
      return;
    }

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

    if (this.isReadOnly && this.selectedDirectory) {
      // Server-side search in Virtual mode
      this.vQuery = (newTerm || '').trim();
      this.vPage = 0;            // reset paging
      this.vTotalPages = 0;

      // 👇 if cleared, just reload the folder so dirs return
      if (!this.vQuery) {
        this.loadDirectoryContents(this.selectedDirectory);
        return;
      }

      this.isLoading = true;

      const sortKey = this.mapVirtualSortKey();
      const rawQ = this.vQuery || '';
      const keepDirs = this.directoryContents
        .filter(x => x.isDirectory)
        .filter(d => {
          // If no query: keep all dirs (browse mode)
          if (!rawQ) return true;
          // Fielded or plain: only keep directories that match the query rules
          return this.directoryMatches(d, rawQ);
        });


      this.dataSource.list(this.selectedDirectory, {
        page: 0,
        size: this.vSize,
        sortKey,
        sortDir: this.sortDir,
        query: this.vQuery || undefined
      }).subscribe({
        next: ({ items, page, totalPages }) => {
          const filesOnly = (items ?? []).filter(i => i.isFile);
          this.directoryContents = [...keepDirs, ...filesOnly];
          this.vPage = page ?? 0;
          this.vTotalPages = totalPages ?? 0;
          this.isLoading = false;
          this.recomputeRenderItems();
        },
        error: () => { this.isLoading = false; }
      });
      return;
    }

    // Filesystem mode: local filter as before
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.recomputeRenderItems();
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
      if (this.isUpdateModeActive() && !this.isValidUpdateDirectory(directoryPath)) {
        this.ngZone.run(() => this.showUpdateDirectoryError());
        return;
      }

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

  private yieldToUi(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  private isCurrentFsLoad(token: number, expectedDirectory?: string | null): boolean {
    return token === this.currentFsLoadToken
      && (!expectedDirectory || this.selectedDirectory === expectedDirectory);
  }

  private getModelVersionKeyFromItem(item: DirectoryItem): string | null {
    if (item.isDirectory || !item.name?.includes('_')) return null;

    const parts = item.name.split('_');
    if (parts.length < 2) return null;

    const modelID = parts[0];
    const versionID = parts[1];

    if (!modelID || !versionID) return null;
    return `${modelID}_${versionID}`;
  }

  private buildModelVersionPayload(items: DirectoryItem[]): { modelID: string; versionID: string }[] {
    const map = new Map<string, { modelID: string; versionID: string }>();

    for (const item of items) {
      const key = this.getModelVersionKeyFromItem(item);
      if (!key) continue;

      const [modelID, versionID] = key.split('_');
      if (!map.has(key)) {
        map.set(key, { modelID, versionID });
      }
    }

    return Array.from(map.values());
  }

  private async mapNormalFsEntry(
    entry: fs.Dirent,
    directoryPath: string,
    isFileDeleted: (fullPath: string) => boolean
  ): Promise<DirectoryItem | null> {
    const fullPath = path.join(directoryPath, entry.name);

    try {
      const stats = await fs.promises.stat(fullPath);

      if (entry.isDirectory()) {
        let count = 0;
        try {
          const kids = await fs.promises.readdir(fullPath);
          count = kids.length;
        } catch {
          // ignore child count failures
        }

        return {
          name: entry.name,
          path: fullPath,
          isFile: false,
          isDirectory: true,
          isDeleted: isFileDeleted(fullPath),
          size: undefined,
          createdAt: this.getCreatedTime(stats),
          modifiedAt: stats.mtime,
          childCount: count,
          isEmpty: count === 0,
        } as DirectoryItem;
      }

      return {
        name: entry.name,
        path: fullPath,
        isFile: true,
        isDirectory: false,
        isDeleted: isFileDeleted(fullPath),
        size: stats.size,
        createdAt: this.getCreatedTime(stats),
        modifiedAt: stats.mtime
      } as DirectoryItem;
    } catch (err) {
      console.error(`Error stating file ${fullPath}:`, err);
      return null;
    }
  }

  private preserveExistingScanData(items: DirectoryItem[]): DirectoryItem[] {
    const existingByPath = new Map<string, any>();

    for (const item of this.directoryContents ?? []) {
      const scanData = (item as any).scanData;
      if (scanData) {
        existingByPath.set(item.path, scanData);
      }
    }

    return items.map(item => {
      const existingScanData = existingByPath.get(item.path);
      if (!existingScanData) return item;

      return {
        ...item,
        scanData: existingScanData
      } as DirectoryItem;
    });
  }

  private queueFsChunkSync(chunkItems: DirectoryItem[], token: number, localPath: string): void {
    if (this.isUpdateModeActive()) return;

    const allPairs = this.buildModelVersionPayload(chunkItems);
    if (!allPairs.length) return;

    // Prevent duplicate model/version sync across chunks for the same load
    const pairs = allPairs.filter(p => {
      const key = `${p.modelID}_${p.versionID}`;
      if (this.syncedFsKeys.has(key)) return false;
      this.syncedFsKeys.add(key);
      return true;
    });

    if (!pairs.length) return;

    this.fsSyncTotalCount += pairs.length;
    this.isFsBackgroundSyncInProgress = true;

    this.fsPhaseMessage = 'Syncing scan data...';
    console.log(`[FS sync] queued ${pairs.length} pairs for ${localPath}`);

    this.activeFsSyncQueue = this.activeFsSyncQueue
      .then(async () => {
        if (!this.isCurrentFsLoad(token, localPath)) return;

        // update-local-path for this chunk
        if (this.explorerState.updateLocalPathEnabled) {
          try {
            await firstValueFrom(
              this.http.post('http://localhost:3000/api/update-local-path', {
                fileArray: pairs,
                localPath
              })
            );
          } catch (err) {
            console.error('Chunk update-local-path failed:', err);
          }
        }

        if (!this.isCurrentFsLoad(token, localPath)) return;

        console.log(`[FS sync] sending ${pairs.length} pairs to /scan-local-files`);

        // scan-local-files for this chunk
        try {
          const response: any = await firstValueFrom(
            this.http.post('http://localhost:3000/api/scan-local-files', {
              compositeList: pairs
            })
          );

          if (!this.isCurrentFsLoad(token, localPath)) return;

          const scannedData = response?.payload?.modelsList ?? [];

          this.ngZone.run(() => {
            if (!this.isCurrentFsLoad(token, localPath)) return;

            this.mergeScannedModelsIntoDirectoryContents(scannedData);
            this.fsSyncedCount += pairs.length;
            this.fsPhaseMessage = `Syncing scan data... ${this.fsSyncedCount} / ${this.fsSyncTotalCount}`;
            console.log(`[FS sync] completed ${this.fsSyncedCount}/${this.fsSyncTotalCount} pairs`);
            this.recomputeRenderItems();
            this.cdr.detectChanges();
          });
        } catch (err) {
          console.error('Chunk scan-local-files failed:', err);
        }
      })
      .catch(err => {
        console.error('Chunk sync queue error:', err);
      });
  }

  private async loadFromFilesystem(directoryPath: string) {
    const loadToken = ++this.currentFsLoadToken;

    try {
      if (this.isUpdateModeActive()) {
        await this.loadUpdateDirectoryContents(directoryPath);
        return;
      }

      const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });

      if (!this.isCurrentFsLoad(loadToken, directoryPath) && this.selectedDirectory !== directoryPath) {
        // continue; selectedDirectory may not be set yet on first load
      }

      if (entries.length === 0) {
        this.ngZone.run(() => {
          if (loadToken !== this.currentFsLoadToken) return;

          this.visibleCount = this.PAGE_SIZE;
          this.selectedDirectory = directoryPath;
          this.directoryContents = [];
          this.selectedFile = null;
          this.selectedFiles = [];
          this.contextFile = null;

          this.errorMessage = 'The selected directory is empty.';
          this.infoMessage = null;

          this.isFsListingInProgress = false;
          this.isFsBackgroundSyncInProgress = false;
          this.fsLoadedCount = 0;
          this.fsTotalCount = 0;
          this.fsSyncedCount = 0;
          this.fsSyncTotalCount = 0;
          this.fsPhaseMessage = `Reading folder entries... 0 / ${entries.length}`;

          this.recomputeRenderItems();
          this.isLoading = false;
        });
        return;
      }

      this.activeFsSyncQueue = Promise.resolve();
      this.syncedFsKeys.clear();

      this.ngZone.run(() => {
        if (loadToken !== this.currentFsLoadToken) return;

        this.selectedDirectory = directoryPath;
        this.directoryContents = [];
        this.selectedFile = null;
        this.selectedFiles = [];
        this.contextFile = null;

        this.errorMessage = null;
        this.infoMessage = null;

        this.isFsListingInProgress = true;
        this.isFsBackgroundSyncInProgress = false;
        this.fsLoadedCount = 0;
        this.fsTotalCount = entries.length;
        this.fsSyncedCount = 0;
        this.fsSyncTotalCount = 0;

        this.recomputeRenderItems();
      });

      await this.recycleService.loadRecords();
      if (!this.isCurrentFsLoad(loadToken, directoryPath)) return;

      const recycleRecords = this.recycleService.getRecords();
      const isFileDeleted = (fullPath: string): boolean =>
        recycleRecords.some(record => record.files.includes(fullPath));

      // These only depend on the directory path, so they can run early.
      this.updateVisitedPath();
      this.fetchVisitedChildren();

      if (!this.explorerState.enableCivitaiMode) {
        const progressiveItems: DirectoryItem[] = [];
        let flushCounter = 0;

        for (let i = 0; i < entries.length; i += this.FS_LOAD_BATCH_SIZE) {
          const chunkIndex = Math.floor(i / this.FS_LOAD_BATCH_SIZE) + 1;
          const totalChunks = Math.ceil(entries.length / this.FS_LOAD_BATCH_SIZE);
          console.log(`[FS load] starting chunk ${chunkIndex}/${totalChunks} for ${directoryPath}`);

          if (!this.isCurrentFsLoad(loadToken, directoryPath)) return;

          const chunk = entries.slice(i, i + this.FS_LOAD_BATCH_SIZE);

          const chunkItems = await Promise.all(
            chunk.map(entry => this.mapNormalFsEntry(entry, directoryPath, isFileDeleted))
          );

          if (!this.isCurrentFsLoad(loadToken, directoryPath)) return;

          const validChunk = chunkItems.filter(Boolean) as DirectoryItem[];
          progressiveItems.push(...validChunk);

          // Queue backend sync for a smaller batch
          for (let j = 0; j < validChunk.length; j += this.FS_SYNC_BATCH_SIZE) {
            const syncChunk = validChunk.slice(j, j + this.FS_SYNC_BATCH_SIZE);
            this.queueFsChunkSync(syncChunk, loadToken, directoryPath);
          }

          flushCounter++;
          const loadedSoFar = Math.min(i + chunk.length, entries.length);
          const isLastChunk = loadedSoFar >= entries.length;

          if (flushCounter >= this.FS_UI_FLUSH_EVERY || isLastChunk) {
            this.ngZone.run(() => {
              if (!this.isCurrentFsLoad(loadToken, directoryPath)) return;

              this.directoryContents = this.preserveExistingScanData([...progressiveItems]);
              this.fsLoadedCount = loadedSoFar;
              this.fsPhaseMessage = `Reading metadata chunk ${chunkIndex} / ${totalChunks}... ${loadedSoFar} / ${entries.length}`;
              this.recomputeRenderItems();
            });

            console.log(`[FS load] finished chunk ${chunkIndex}/${totalChunks}. Loaded ${loadedSoFar}/${entries.length}`);

            flushCounter = 0;
            await this.yieldToUi();
          }
        }

        await this.activeFsSyncQueue;

        this.ngZone.run(() => {
          if (!this.isCurrentFsLoad(loadToken, directoryPath)) return;

          this.directoryContents = this.preserveExistingScanData([...progressiveItems]);
          this.fsLoadedCount = this.fsTotalCount;
          this.isFsListingInProgress = false;
          this.isFsBackgroundSyncInProgress = false;
          this.isLoading = false;
          this.fsPhaseMessage = '';
          console.log(`[FS load] completed for ${directoryPath}`);
          this.recomputeRenderItems();
        });
      } else {
        // Leave your current Civitai-mode branch as-is for now
        const directories: DirectoryItem[] = [];
        const groupMap = new Map<string, {
          allFiles: string[];
          previewPath?: string;
          totalSize: number;
          createdAt?: Date;
          modifiedAt?: Date;
        }>();

        await Promise.all(
          entries.map(async entry => {
            const file = entry.name;
            const fullPath = path.join(directoryPath, file);
            try {
              const stats = await fs.promises.stat(fullPath);
              if (entry.isDirectory()) {
                let count = 0;
                try {
                  const kids = await fs.promises.readdir(fullPath);
                  count = kids.length;
                } catch { }

                directories.push({
                  name: file,
                  path: fullPath,
                  isFile: false,
                  isDirectory: true,
                  isDeleted: isFileDeleted(fullPath),
                  size: undefined,
                  createdAt: this.getCreatedTime(stats),
                  modifiedAt: stats.mtime,
                  childCount: count,
                  isEmpty: count === 0,
                });
              } else {
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

                if (file.endsWith('.preview.png')) {
                  groupMap.get(prefix)!.previewPath = fullPath;
                }
              }
            } catch (err) {
              console.error(`Error stating file ${fullPath}:`, err);
            }
          })
        );

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

        const progressiveGroupedItems: DirectoryItem[] = [];
        this.fsTotalCount = directories.length + groupedItems.length;

        this.ngZone.run(() => {
          if (!this.isCurrentFsLoad(loadToken, directoryPath)) return;

          this.directoryContents = [...directories];
          this.fsLoadedCount = directories.length;
          this.isFsListingInProgress = true;
          this.isFsBackgroundSyncInProgress = false;
          this.recomputeRenderItems();
        });

        for (let i = 0; i < groupedItems.length; i += this.FS_LOAD_BATCH_SIZE) {
          if (!this.isCurrentFsLoad(loadToken, directoryPath)) return;

          const uiChunk = groupedItems.slice(i, i + this.FS_LOAD_BATCH_SIZE);
          progressiveGroupedItems.push(...uiChunk);

          for (let j = 0; j < uiChunk.length; j += this.FS_SYNC_BATCH_SIZE) {
            const syncChunk = uiChunk.slice(j, j + this.FS_SYNC_BATCH_SIZE);
            this.queueFsChunkSync(syncChunk, loadToken, directoryPath);
          }

          this.ngZone.run(() => {
            if (!this.isCurrentFsLoad(loadToken, directoryPath)) return;

            this.directoryContents = this.preserveExistingScanData([...directories, ...progressiveGroupedItems]);
            this.fsLoadedCount = directories.length + progressiveGroupedItems.length;
            this.recomputeRenderItems();
          });

          await this.yieldToUi();
        }

        await this.activeFsSyncQueue;

        this.ngZone.run(() => {
          if (!this.isCurrentFsLoad(loadToken, directoryPath)) return;

          this.directoryContents = this.preserveExistingScanData([...directories, ...progressiveGroupedItems]);
          this.fsLoadedCount = this.fsTotalCount;
          this.isFsListingInProgress = false;
          this.isFsBackgroundSyncInProgress = false;
          this.isLoading = false;
          this.recomputeRenderItems();
        });

        if (this.directoryContents.length > 0) {
          this.updateLocalPath();
          this.scanLocalFiles();
        }
      }

      console.log('Directory Contents:', this.directoryContents);
    } catch (err) {
      console.error('Error reading directory:', err);
      this.ngZone.run(() => {
        if (loadToken !== this.currentFsLoadToken) return;

        this.errorMessage = 'Failed to read the directory contents.';
        this.isFsListingInProgress = false;
        this.isFsBackgroundSyncInProgress = false;
        this.isLoading = false;
      });
    }
  }

  private async collectFilesRecursively(rootDir: string): Promise<string[]> {
    const files: string[] = [];
    const stack = [rootDir];

    while (stack.length) {
      const current = stack.pop()!;
      let entries: fs.Dirent[] = [];
      try {
        entries = await fs.promises.readdir(current, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private async loadUpdateDirectoryContents(directoryPath: string): Promise<void> {
    this.updateSearchResultBySourcePath = {};
    this.ngZone.run(() => {
      this.selectedDirectory = directoryPath;
      this.errorMessage = null;
      this.infoMessage = null;
    });

    await this.recycleService.loadRecords();
    const recycleRecords = this.recycleService.getRecords();
    const isFileDeleted = (fullPath: string): boolean =>
      recycleRecords.some(record => record.files.includes(fullPath));

    const allFiles = await this.collectFilesRecursively(directoryPath);
    const groupMap = new Map<string, {
      allFiles: string[];
      representativePath?: string;
      previewPath?: string;
      totalSize: number;
      createdAt?: Date;
      modifiedAt?: Date;
    }>();

    for (const fullPath of allFiles) {
      const file = path.basename(fullPath);
      const prefix = this.getCivitaiPrefix(file);
      if (!prefix) continue;

      let stats: fs.Stats;
      try {
        stats = await fs.promises.stat(fullPath);
      } catch {
        continue;
      }

      if (!groupMap.has(prefix)) {
        groupMap.set(prefix, {
          allFiles: [],
          totalSize: 0,
          representativePath: fullPath
        });
      }

      const group = groupMap.get(prefix)!;
      group.allFiles.push(fullPath);
      group.totalSize += stats.size;

      const created = this.getCreatedTime(stats);
      const modified = stats.mtime;
      group.createdAt = group.createdAt ? (created < group.createdAt ? created : group.createdAt) : created;
      group.modifiedAt = group.modifiedAt ? (modified > group.modifiedAt ? modified : group.modifiedAt) : modified;

      if (file.endsWith('.preview.png')) {
        group.previewPath = fullPath;
      }
    }

    const groupedItems: DirectoryItem[] = [];
    groupMap.forEach((group) => {
      const displayPath = group.previewPath ?? group.representativePath;
      if (!displayPath) return;

      groupedItems.push({
        name: path.basename(displayPath),
        path: displayPath,
        isFile: true,
        isDirectory: false,
        isDeleted: isFileDeleted(displayPath),
        civitaiGroup: group.allFiles,
        size: group.totalSize,
        createdAt: group.createdAt,
        modifiedAt: group.modifiedAt
      });
    });

    this.ngZone.run(() => {
      this.directoryContents = groupedItems;
      this.selectedFile = null;
      this.selectedFiles = [];
      this.contextFile = null;
      this.isLoading = false;
      this.recomputeRenderItems();
      this.showUpdateSidebar = this.isUpdateModeActive();
    });

    if (this.directoryContents.length > 0) {
      this.scanLocalFiles();
      this.updateVisitedPath();
      this.fetchVisitedChildren();
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
      this.vQuery = ''; // 👈 clear search when navigating
      this.vPage = 0;
      this.vTotalPages = 0;
      const sortKey = this.mapVirtualSortKey();

      this.dataSource.list(pathToLoad, {
        page: 0,
        size: this.vSize,
        sortKey,
        sortDir: this.sortDir,
        query: this.vQuery || undefined, // 👈
      }).subscribe({
        next: ({ items, selectedDirectory, page, totalPages, totalElements }) => {
          this.ngZone.run(() => {
            this.selectedDirectory = selectedDirectory;
            this.directoryContents = items;
            this.isLoading = false;

            // drives (unchanged)
            const drives = new Set<string>();
            for (const it of items as any[]) {
              const d = this.normalizeDrive((it as any)?.drive);
              if (d) drives.add(d);
            }
            this.availableDrives = Array.from(drives).sort();

            this.vPage = page ?? 0;
            this.vTotalPages = totalPages ?? 0;
            this.vTotalElements = totalElements ?? 0;

            // count dirs from the list we put in page 0
            this.vDirCount = (items ?? []).reduce((n, it) => n + (it.isDirectory ? 1 : 0), 0);

            this.recomputeRenderItems();
          });
        }
        ,
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

    if (this.isUpdateModeActive() && !this.isValidUpdateDirectory(directoryPath)) {
      this.ngZone.run(() => this.showUpdateDirectoryError());
      return;
    }

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

    if (this.isUpdateModeActive()) {
      return;
    }

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

    if (this.isUpdateModeActive()) {
      return;
    }

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

    if (this.isUpdateModeActive()) {
      this.visitedSubdirs = [];
      return;
    }


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

  get plannedUpdateActionCount(): number {
    return this.fileListComponent?.getUpdateBatchActionPlan?.().length ?? 0;
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
          return { ...item, scanData: scanned, _searchText: undefined as any };
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


  setSort(key: 'name' | 'size' | 'modified' | 'created' | 'myRating' | 'modelNumber' | 'versionNumber') {
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

  private getModelNumberN(it: DirectoryItem): number {
    // Virtual → prefer scanData
    const sd: any = (it as any).scanData;
    const v1 = sd?.modelNumber ?? (it as any).modelNumber ?? null;
    if (v1 != null && /^\d+$/.test(String(v1))) return Number(v1);

    // FS → parse filename like "123_456_..."
    const m = it.name?.match(/^(\d+)_/);
    return m ? Number(m[1]) : Number.NaN;
  }

  private getVersionNumberN(it: DirectoryItem): number {
    // Virtual → prefer scanData
    const sd: any = (it as any).scanData;
    const v2 = sd?.versionNumber ?? (it as any).versionNumber ?? null;
    if (v2 != null && /^\d+$/.test(String(v2))) return Number(v2);

    // FS → parse filename like "123_456_..."
    const m = it.name?.match(/^\d+_(\d+)_/);
    return m ? Number(m[1]) : Number.NaN;
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
    this.fileViewSubmenuOpen = false;
    this.dirViewSubmenuOpen = false;

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

    // 👇 let copy/paste shortcuts through
    if (event.ctrlKey || event.metaKey || event.altKey) return;

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
    this.switchFilesView(mode as ViewMode);
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

  onUpdateSelectAllRequested(): void {
    const selectable = this.getUpdateSelectableItems();
    if (this.fileListComponent) {
      this.fileListComponent.selectedItems = [...selectable];
      this.fileListComponent.selectionChanged.emit(this.fileListComponent.selectedItems);
    }
  }

  onUpdateSelectTopNRequested(count: number): void {
    const selectable = this.getUpdateSelectableItems().slice(0, Math.max(0, count));
    if (this.fileListComponent) {
      this.fileListComponent.selectedItems = [...selectable];
      this.fileListComponent.selectionChanged.emit(this.fileListComponent.selectedItems);
    }
  }

  async onUpdatePerformActionsRequested(): Promise<void> {
    const plan: UpdateBatchActionPlanItem[] = this.fileListComponent?.getUpdateBatchActionPlan?.() ?? [];

    console.log(`[Update tab] Perform Actions clicked. Planned action count: ${plan.length}`);
    plan.forEach((item, index) => {
      console.log(
        `[Update tab] Action #${index + 1}: ${item.action} | source=${item.source.path} | result=${item.result.path}`
      );
    });

    if (!plan.length) {
      alert('No actionable rows selected. Pick a result and an action (not Do nothing).');
      return;
    }

    if (!window.confirm(`Run ${plan.length} planned action(s)?`)) {
      return;
    }

    const errors: string[] = [];

    for (const [index, item] of plan.entries()) {
      try {
        if (item.action === 'upgrade') {
          await this.executeUpdateUpgrade(item.source, item.result);
        } else if (item.action === 'add') {
          await this.executeUpdateAddToLocation(item.source, item.result);
        } else if (item.action === 'delete') {
          await this.executeUpdateDelete(item.result);
        }
      } catch (error) {
        console.error(`[Update tab] Failed action #${index + 1}`, error);
        errors.push(`#${index + 1} ${item.action} (${item.source.name})`);
      }
    }

    if (errors.length) {
      alert(`Batch actions completed with errors\n${errors.join('\n')}`);
    } else {
      alert('Batch actions completed successfully.');
    }

    this.homeRefreshService.triggerRefresh();
  }

  private normalizeSetId(fileName: string): string {
    const match = fileName.match(/^([^\.]+)/);
    return match ? match[1] : fileName;
  }


  private getModelVersionSetIdFromFileName(fileName: string): string {
    const stem = fileName.split('.')[0] || fileName;
    const parts = stem.split('_');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0]}_${parts[1]}`;
    }
    return this.normalizeSetId(fileName);
  }

  private async moveFileAsync(src: string, dest: string): Promise<void> {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      await fs.promises.mkdir(destDir, { recursive: true });
    }

    if (!fs.existsSync(src)) {
      throw new Error(`Source does not exist: ${src}`);
    }

    try {
      await fs.promises.rename(src, dest);
    } catch {
      await fs.promises.copyFile(src, dest);
      await fs.promises.unlink(src);
    }
  }

  private getDeleteTarget(src: string): string {
    const deleteFolder = this.recycleService.getDeleteFolderPath();
    const target = path.join(deleteFolder, path.basename(src));
    return this.getUniqueFilePath(target);
  }

  private async getSetFilesInDirectory(dirPath: string, modelVersionSetId: string): Promise<string[]> {
    const allFiles = await this.collectFilesRecursively(dirPath);
    return allFiles.filter((fullPath) => {
      const fileName = path.basename(fullPath);
      return this.getModelVersionSetIdFromFileName(fileName) === modelVersionSetId;
    });
  }

  private async executeUpdateUpgrade(source: DirectoryItem, result: DirectoryItem): Promise<void> {
    const updateDir = path.dirname(source.path);
    const productionDir = path.dirname(result.path);

    const updateSetId = this.getModelVersionSetIdFromFileName(source.name);
    const resultSetId = ((result as any).displayName as string | undefined) ?? this.getModelVersionSetIdFromFileName(result.name);

    const updateFiles = await this.getSetFilesInDirectory(updateDir, updateSetId);
    const productionFiles = await this.getSetFilesInDirectory(productionDir, resultSetId);

    // Replace semantics (same as sidebar upgrade):
    // 1) move selected production/result-set files to delete folder
    for (const prod of productionFiles) {
      if (fs.existsSync(prod)) {
        await this.moveFileAsync(prod, this.getDeleteTarget(prod));
      }
    }

    // 2) move selected update-set files into production folder
    for (const src of updateFiles) {
      const target = path.join(productionDir, path.basename(src));
      await this.moveFileAsync(src, target);
    }
  }

  private async executeUpdateAddToLocation(source: DirectoryItem, result: DirectoryItem): Promise<void> {
    const updateDir = path.dirname(source.path);
    const productionDir = path.dirname(result.path);
    const setId = this.getModelVersionSetIdFromFileName(source.name);

    const updateFiles = await this.getSetFilesInDirectory(updateDir, setId);
    await fs.promises.mkdir(productionDir, { recursive: true });

    for (const src of updateFiles) {
      const target = path.join(productionDir, path.basename(src));
      if (!fs.existsSync(target)) {
        await this.moveFileAsync(src, target);
      }
    }
  }

  private async executeUpdateDelete(source: DirectoryItem): Promise<void> {
    const updateDir = path.dirname(source.path);
    const setId = this.getModelVersionSetIdFromFileName(source.name);
    const updateFiles = await this.getSetFilesInDirectory(updateDir, setId);

    for (const src of updateFiles) {
      await this.moveFileAsync(src, this.getDeleteTarget(src));
    }
  }

  async onUpdateSearchSelectedRequested(): Promise<void> {
    const selected = (this.fileListComponent?.selectedItems ?? []).filter((i) => i.isFile);

    const bySource: Record<string, DirectoryItem[]> = {};

    if (!selected.length) {
      this.updateSearchResultBySourcePath = {};
      this.searchingUpdateSelections = false;
      this.updateSearchCurrentItemName = '';
      this.updateSearchProcessedCount = 0;
      this.updateSearchTotalCount = 0;
      this.cdr.markForCheck();
      return;
    }

    this.searchingUpdateSelections = true;
    this.updateSearchCurrentItemName = '';
    this.updateSearchProcessedCount = 0;
    this.updateSearchTotalCount = selected.length;
    this.cdr.detectChanges();

    const totalStart = performance.now();
    console.log(`[Update tab] Search Selected Item started. Selected file count: ${selected.length}`);

    try {
      for (let i = 0; i < selected.length; i++) {
        const item = selected[i];

        this.updateSearchCurrentItemName = this.getUpdateSearchDisplayName(item);
        this.updateSearchProcessedCount = i;
        this.cdr.detectChanges();

        const ids = this.extractIdsFromItem(item);
        if (!ids) {
          bySource[item.path] = [];
          console.warn(`[Update tab] Skipping item with unparsable IDs: ${item.name}`);
          this.updateSearchProcessedCount = i + 1;
          this.cdr.detectChanges();
          continue;
        }

        const hintPath = this.getUpdateHintPath(item.path);
        const itemStart = performance.now();

        const progress = await lastValueFrom(
          this.searchService.searchByModelAndVersion(ids.modelId, ids.versionId, hintPath, item.path)
        );

        const itemElapsedSeconds = (performance.now() - itemStart) / 1000;
        const matchCount = progress?.results?.length ?? 0;

        console.log(
          `[Update tab] Search completed for ${item.name} (model=${ids.modelId}, version=${ids.versionId}) in ${itemElapsedSeconds.toFixed(3)}s. Matches: ${matchCount}`
        );

        const matches = this.collapseSearchMatchesToSetRepresentatives(progress?.results ?? [], item.path);
        bySource[item.path] = matches;

        this.updateSearchProcessedCount = i + 1;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error searching selected update items from file-list selection', error);
    } finally {
      this.updateSearchResultBySourcePath = bySource;
      this.searchingUpdateSelections = false;
      this.updateSearchCurrentItemName = '';
      this.cdr.markForCheck();

      const totalElapsedSeconds = (performance.now() - totalStart) / 1000;
      console.log(`[Update tab] Search Selected Item finished in ${totalElapsedSeconds.toFixed(3)}s.`);
    }
  }

  private collapseSearchMatchesToSetRepresentatives(matchPaths: string[], sourceItemPath?: string): DirectoryItem[] {
    const bySetId = new Map<string, string[]>();
    const sourceNorm = sourceItemPath ? sourceItemPath.replace(/\\/g, '/').toLowerCase() : '';
    const sourceName = sourceItemPath ? sourceItemPath.split(/\\|\//).pop() || sourceItemPath : '';
    const sourceSetId = sourceName ? this.getModelVersionSetId(sourceName) : '';

    for (const matchPath of matchPaths) {
      const matchNorm = matchPath.replace(/\\/g, '/').toLowerCase();
      if (sourceNorm && matchNorm === sourceNorm) {
        continue; // never include the selected source item itself
      }

      const name = matchPath.split(/\\|\//).pop() || matchPath;
      const setId = this.getModelVersionSetId(name);
      if (sourceSetId && setId === sourceSetId) {
        continue; // mirror sidebar behavior: exclude same set as source item
      }

      const existing = bySetId.get(setId) ?? [];
      existing.push(matchPath);
      bySetId.set(setId, existing);
    }

    const pickRepresentative = (paths: string[]): string => {
      const extPriority = ['.safetensors', '.ckpt', '.pt', '.pth', '.bin', '.zip'];

      const getFolderPriority = (p: string): number => {
        const norm = p.replace(/\\/g, '/').toLowerCase();

        if (norm.includes('/@scan@/delete/')) return 3;
        if (norm.includes('/@scan@/update/')) return 2;
        return 1; // normal result folders like ACG/...
      };

      const getExtPriority = (p: string): number => {
        const name = (p.split(/\\|\//).pop() || p).toLowerCase();
        const idx = extPriority.findIndex(ext => name.endsWith(ext));
        return idx === -1 ? 999 : idx;
      };

      const sorted = [...paths].sort((a, b) => {
        const folderDiff = getFolderPriority(a) - getFolderPriority(b);
        if (folderDiff !== 0) return folderDiff;

        const extDiff = getExtPriority(a) - getExtPriority(b);
        if (extDiff !== 0) return extDiff;

        return a.localeCompare(b);
      });

      return sorted[0];
    };

    return Array.from(bySetId.entries()).map(([setId, paths]) => {
      const chosen = pickRepresentative(paths);
      const chosenName = chosen.split(/\\|\//).pop() || chosen;
      const previewPath = this.pickPreviewImagePath(paths);
      return {
        name: chosenName,
        path: chosen,
        isFile: true,
        isDirectory: false,
        displayName: setId,
        previewPath,
        scanData: this.parseSearchResultScanData(chosenName, setId)
      } as DirectoryItem;
    });
  }

  private parseSearchResultScanData(fileName: string, fallbackSetId: string): any {
    const stem = fileName.split('.')[0] || fileName;
    const parts = stem.split('_');

    const fallbackParts = fallbackSetId.split('_');
    const modelNumber = parts[0] || fallbackParts[0] || undefined;
    const versionNumber = parts[1] || fallbackParts[1] || undefined;
    const baseModel = parts[2] || undefined;
    const creatorName = parts[3] || undefined;
    const mainModelName = parts.slice(4).join('_') || fallbackSetId;

    return {
      modelNumber,
      versionNumber,
      baseModel,
      creatorName,
      mainModelName
    };
  }

  private pickPreviewImagePath(paths: string[]): string | undefined {
    const previewImage = paths.find((p) => {
      const name = (p.split(/\\|\//).pop() || p).toLowerCase();
      return /\.(png|jpe?g|webp|gif)$/.test(name) && name.includes('preview');
    });
    if (previewImage) return previewImage;

    return paths.find((p) => /\.(png|jpe?g|webp|gif)$/i.test(p.split(/\\|\//).pop() || p));
  }

  private getModelVersionSetId(fileName: string): string {
    const beforeDot = fileName.split('.')[0] || fileName;
    const parts = beforeDot.split('_');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0]}_${parts[1]}`;
    }

    const fallback = fileName.match(/^([^\.]+)/);
    return fallback ? fallback[1] : fileName;
  }

  get selectedUpdateItemCount(): number {
    return (this.selectedFiles ?? []).filter(item => item.isFile).length;
  }

  private getUpdateSearchDisplayName(item: DirectoryItem): string {
    const name = item?.name || '';

    return name
      .replace(/\.preview\.(png|jpe?g|webp|gif)$/i, '')
      .replace(/\.(zip|safetensors|ckpt|pt|pth|bin|png|jpe?g|webp|gif)$/i, '');
  }

  private getUpdateSelectableItems(): DirectoryItem[] {
    return (this.renderItems ?? []).filter((item) => item.isFile);
  }

  private getUpdateHintPath(itemPath: string): string | undefined {
    const lower = itemPath.toLowerCase();
    const updateIndex = lower.indexOf('\\update\\');
    if (updateIndex === -1) return undefined;
    const afterUpdate = itemPath.substring(updateIndex + 8);
    return path.dirname(afterUpdate);
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
    if (this.isUpdateModeActive()) return;
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

    if (this.isUpdateModeActive()) return;

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
      case 'modelNumber': {
        const an = this.getModelNumberN(a), bn = this.getModelNumberN(b);
        const aBad = Number.isNaN(an), bBad = Number.isNaN(bn);
        if (aBad && !bBad) return 1;     // push “unknown” to bottom
        if (bBad && !aBad) return -1;
        cmp = (aBad ? 0 : an) - (bBad ? 0 : bn);
        break;
      }
      case 'versionNumber': {
        const an = this.getVersionNumberN(a), bn = this.getVersionNumberN(b);
        const aBad = Number.isNaN(an), bBad = Number.isNaN(bn);
        if (aBad && !bBad) return 1;
        if (bBad && !aBad) return -1;
        cmp = (aBad ? 0 : an) - (bBad ? 0 : bn);
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
    // Virtual: show true total from server when not filtering
    if (this.isReadOnly && !this.searchTerm && !this.deepSearchActive && this.vTotalElements) {
      return this.vTotalElements;
    }
    // Otherwise (FS or filtering), count what’s loaded
    const list = this.directoryContents ?? [];
    return list.reduce((n, it) => n + (it.isFile ? 1 : 0), 0);
  }

  get totalDirsCount(): number {
    if (this.isReadOnly) return this.vDirCount;
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

  // put this near your component class
  private readonly FIELD_SYNTAX =
    /(^|\s)\w+\s*:\s*(?:"[^"]*"|'[^']*'|\S+)/;

  // split: keep quoted phrases, split by comma or whitespace otherwise
  private smartSplit(raw: string): string[] {
    const out: string[] = [];
    const re = /"([^"]+)"|'([^']+)'|([^,\s]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      out.push((m[1] || m[2] || m[3]).trim());
    }
    return out;
  }

  // --- helpers (you already have parseMaybeJson; keep it) ---
  private safeSlug(s: string): string {
    return (s || '')
      .replace(/[\\/:*?"<>|]/g, ' ')     // strip illegal FS chars
      .replace(/\s+/g, ' ')              // collapse spaces
      .trim();
  }

  /** Try to synthesize a local preview path if backend didn’t provide URLs */
  private deriveFirstImageUrlFromLocal(row: any): string | null {
    const local = row?.localPath;
    if (!local) return null;

    const model = String(row?.modelNumber ?? '');
    const ver = String(row?.versionNumber ?? '');
    const base = this.safeSlug(String(row?.baseModel ?? ''));
    const main = this.safeSlug(String(row?.mainModelName ?? row?.name ?? ''));

    if (!model || !ver || !main) return null;

    // expected filename convention: 123_456_SDXL_My Model.preview.png
    const filePath = `${local.replace(/\\/g, '/')}/${model}_${ver}${base ? '_' + base : ''}_${main}.preview.png`;
    return `file:///${encodeURI(filePath)}`;
  }

  /** ✅ NEW: robust mapper for /find-virtual-files rows */
  private mapVirtualRowToDirectoryItem(row: any): any {
    const modelNumber = String(row.modelNumber ?? row.modelId ?? row.model_id ?? '');
    const versionNumber = String(row.versionNumber ?? row.versionId ?? row.version_id ?? '');
    const baseModel = row.baseModel ?? row.base_model ?? '';
    const mainName = row.mainModelName ?? row.name ?? '';
    const creatorName = row.creatorName ?? row.creator ?? row.details?.creatorName ?? '';

    // Build a consistent display name like your other views
    const name = [modelNumber, versionNumber, baseModel, mainName].filter(Boolean).join('_');

    // Logical path for virtual items (unique/stable)
    const logicalPath = `\\VIRTUAL\\${modelNumber || 'M'}_${versionNumber || 'V'}\\${this.safeSlug(mainName || 'model')}`;

    // --- normalize media ---
    let imageUrls = this.parseMaybeJson<string[]>(row.imageUrls ?? row.images ?? row.imagesJson);
    if (!Array.isArray(imageUrls)) imageUrls = [];
    const firstImageUrl =
      row.firstImageUrl ??
      (imageUrls.length ? imageUrls[0] : null) ??
      this.deriveFirstImageUrlFromLocal(row); // last-resort: guess from localPath

    // --- normalize list-y fields (may arrive as JSON strings) ---
    const tags = this.parseMaybeJson<string[]>(row.tags) ?? [];
    const aliases = this.parseMaybeJson<string[]>(row.aliases) ?? [];
    const triggerWords = this.parseMaybeJson<string[]>(row.triggerWords) ?? [];

    // --- normalize stats ---
    const statsObj = this.parseMaybeJson<any>(row.stats ?? row.statsJson);
    const statsParsed = (statsObj && typeof statsObj === 'object') ? statsObj : undefined;
    const stats = statsParsed ? JSON.stringify(statsParsed) : undefined;

    const item: any = {
      id: row.id ?? row._id ?? `${modelNumber}_${versionNumber}`,
      name,
      path: logicalPath,
      isFile: true,
      isDirectory: false,
      drive: row.drive ?? 'all',
      localPath: row.localPath ?? '',
      myRating: row.myRating ?? null, // surface for sort-by-rating if needed
    };

    // The sidebar & thumbnails read from scanData — mirror your deep DTO shape
    item.scanData = {
      modelNumber, versionNumber, baseModel,
      mainModelName: mainName,
      creatorName,
      tags, aliases, triggerWords,
      myRating: row.myRating ?? null,
      imageUrls,
      firstImageUrl,             // your FileList prefers this if present
      statsParsed, stats,

      // pass through useful raw bits for the sidebar
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
      localPath: row.localPath ?? null,

      // keep whole row in case sidebar needs extra fields later
      ...row
    };

    return item;
  }


  onDeepSearch(raw: string) {
    const q = (raw || '').trim();
    if (!q) { this.clearDeepSearch(); return; }

    // if it LOOKS like fielded query => use /find-virtual-files
    if (this.FIELD_SYNTAX.test(q)) {
      this.isLoading = true;
      const body = {
        path: "/",                // search ANYWHERE (your backend treats "/" as “no restriction”)
        page: 0,
        size: 99999,               // choose a sensible cap; increase if you like
        sortKey: this.sortKey ?? 'relevance',
        sortDir: this.sortDir ?? 'desc',
        q
      };

      this.http.post<any>('http://localhost:3000/api/find-virtual-files', body)
        .subscribe({
          next: (res) => {
            // Virtual returns: { payload: { content: [{ drive, model: {...} }, ...] } }
            // Normalize to Tampermonkey's: modelsList: model[]
            const list: any[] = Array.isArray(res?.payload?.content)
              ? res.payload.content
                .map((row: any) => row?.model)
                .filter(Boolean)
              : [];

            this.deepSearchItems = list.map(dto => this.mapDeepDtoToDirectoryItem(dto));
            this.deepSearchActive = true;
            this.recomputeRenderItems();
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Deep search (fielded) failed:', err);
            this.isLoading = false;
          }
        });
      return;
    }

    // otherwise: tag-mode – send to your existing deep-search endpoint
    const tagList = this.smartSplit(q);
    if (!tagList.length) { this.clearDeepSearch(); return; }

    this.isLoading = true;
    this.http.post<any>(
      'http://localhost:3000/api/find-list-of-models-dto-from-all-table-by-tagsList-tampermonkey',
      {
        tagsList: tagList,
        // let the backend optionally use these for consistent UX
        sortKey: this.sortKey ?? 'name',
        sortDir: this.sortDir ?? 'asc',
        // also include the raw query so backend could choose to branch too (optional)
        q
      }
    ).subscribe({
      next: (res) => {


        console.log("res");
        console.log(res);

        const list: any[] = res?.payload?.modelsList ?? [];
        this.deepSearchItems = list.map(dto => this.mapDeepDtoToDirectoryItem(dto));
        this.deepSearchActive = true;
        this.recomputeRenderItems();
        this.isLoading = false;
      },
      error: (err) => { console.error('Deep search (tags) failed:', err); this.isLoading = false; }
    });
  }

  // small utils
  private parseMaybeJson<T = any>(v: any): T {
    if (v == null) return v as T;
    if (typeof v !== 'string') return v as T;
    try { return JSON.parse(v) as T; } catch { return v as T; }
  }

  private coalesceName(row: any): string {
    return row?.name || row?.mainModelName ||
      (row?.modelNumber && row?.versionNumber ? `${row.modelNumber}_${row.versionNumber}` : 'Unknown');
  }

  // ✅ adapt this to however you build thumbnails in deep search
  private buildPreviewFromRow(row: any): string | null {
    // 1) if backend already gives a preview url, use it
    if (row?.previewUrl) return row.previewUrl;

    // 2) else if your deep mapper has a util (recommended), call that:
    // return this.buildPreviewFromLocalPath(row?.localPath);

    // 3) else leave null and let UI fall back
    return null;
  }

  /** Convert one /find-virtual-files row (Models_Table_Entity map) to your Deep DTO */
  private virtualRowToDeepDTO(row: any) {
    return {
      id: row.id ?? row._id ?? null,
      name: this.coalesceName(row),
      mainModelName: row.mainModelName ?? null,
      modelNumber: row.modelNumber ?? null,
      versionNumber: row.versionNumber ?? null,
      baseModel: row.baseModel ?? null,
      localPath: row.localPath ?? null,
      // these may be JSON strings in the DB; parse if needed
      tags: this.parseMaybeJson<string[]>(row.tags) ?? [],
      aliases: this.parseMaybeJson<string[]>(row.aliases) ?? [],
      triggerWords: this.parseMaybeJson<string[]>(row.triggerWords) ?? [],
      myRating: row.myRating ?? null,
      // useful extras
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
      // make sure images work exactly like your deep-search DTOs
      previewUrl: this.buildPreviewFromRow(row),
      // add anything else your mapDeepDtoToDirectoryItem expects
    };
  }


  clearDeepSearch() {
    this.deepSearchActive = false;
    this.deepSearchItems = [];
    this.recomputeRenderItems();         // ✅ go back to normal windowed list
  }


  /** Normalize API DTO into the shape the file list expects in Virtual mode */
  /** Normalize API DTO into the shape the file list expects in Virtual mode */
  private mapDeepDtoToDirectoryItem(dto: any): DirectoryItem {
    console.log('dto keys', Object.keys(dto));
    console.log('dto.localPath (raw):', JSON.stringify(dto?.localPath));

    const firstNonBlank = (...candidates: any[]) =>
      candidates.find(v => typeof v === 'string' && v.trim().length > 0) ?? '';

    const modelId = String(dto?.modelNumber ?? dto?.modelId ?? dto?.modelID ?? '');
    const versionId = String(dto?.versionNumber ?? dto?.versionId ?? dto?.versionID ?? '');
    const baseModel = firstNonBlank(dto?.baseModel, dto?.modelBase);
    const mainName = firstNonBlank(dto?.mainModelName, dto?.name, dto?.modelName);

    // Accept multiple possible keys and treat '' as missing
    const localPath = firstNonBlank(dto?.localPath, dto?.path, dto?.virtualPath, dto?.logicalPath);

    const name = [modelId, versionId, baseModel, mainName].filter(Boolean).join('_');

    // Use a stable synthetic prefix if localPath is missing
    const logicalPath =
      `\\${localPath || '@virtual'}\\${modelId || 'M'}_${versionId || 'V'}\\${mainName || 'model'}`;

    // Normalize image urls
    let imageUrls: any = dto?.imageUrls ?? dto?.images?.imageUrls ?? dto?.images ?? null;
    if (typeof imageUrls === 'string') {
      try { imageUrls = JSON.parse(imageUrls); } catch { imageUrls = null; }
    }
    if (Array.isArray(imageUrls)) {
      imageUrls = imageUrls.map((u: any) => (typeof u === 'string' ? u : u?.url)).filter(Boolean);
    }

    const item: DirectoryItem = {
      name,
      path: logicalPath,
      isFile: true,
      isDirectory: false,
      isDeleted: false
    } as any;

    (item as any).scanData = {
      ...dto,
      modelNumber: modelId || dto?.modelNumber,
      versionNumber: versionId || dto?.versionNumber,
      baseModel,
      mainModelName: mainName,
      localPath,    // <- ensure it’s present in scanData as well
      imageUrls
    };

    return item;
  }


  onMyRatingChanged() {
    if (this.sortKey === 'myRating') {
      this.recomputeRenderItems();   // re-sorts and updates the windowed list
    }
  }


  private mapVirtualSortKey():
    'name' | 'created' | 'modified' | 'myRating' | 'modelNumber' | 'versionNumber' {
    switch (this.sortKey) {
      case 'created': return 'created';
      case 'modified': return 'modified';
      case 'myRating': return 'myRating';
      case 'modelNumber': return 'modelNumber';
      case 'versionNumber': return 'versionNumber';
      default: return 'name';
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
      sortDir: this.sortDir,
      query: this.vQuery || undefined   // 👈 keep passing search term
    }).subscribe({
      next: ({ items, page, totalPages, totalElements }) => {
        const filesOnly = (items ?? []).filter(i => i.isFile);
        console.log('[Virtual] received page', page, 'files', filesOnly.length, 'totalPages', totalPages);

        this.directoryContents = [...this.directoryContents, ...filesOnly];
        this.vPage = page ?? (this.vPage + 1);
        this.vTotalPages = totalPages ?? this.vTotalPages;
        if (typeof totalElements === 'number') this.vTotalElements = totalElements;

        this.vLoading = false;
        this.recomputeRenderItems();
      },
      error: (err) => {
        console.error('Virtual next page error:', err);
        this.vLoading = false;
      }
    });
  }

  /** true if q contains fielded syntax like foo:"bar" or mainModelName:baz */
  private hasFieldSyntax(q: string): boolean {
    if (!q) return false;
    return /(^|\s)\w+\s*:\s*(?:"[^"]*"|'[^']*'|\S+)/.test(q);
  }

  /** strip fielded parts; return leftover plain text (used for directory name matching) */
  private extractFreeText(q: string): string {
    if (!q) return '';
    return q.replace(/(^|\s)\w+\s*:\s*(?:"[^"]*"|'[^']*'|\S+)/g, ' ').trim();
  }

  /** extract a specific field value from q, e.g. getFieldValue(q, 'localPath') */
  private getFieldValue(q: string, field: string): string | null {
    const re = new RegExp(`(?:^|\\s)${field}\\s*:\\s*(?:"([^"]*)"|'([^']*)'|(\\S+))`, 'i');
    const m = re.exec(q || '');
    return m ? (m[1] || m[2] || m[3] || '').trim() : null;
  }

  /** decide whether a DIRECTORY should be shown for a given query */
  private directoryMatches(dir: any, rawQ: string): boolean {
    const name = (dir?.name || '').toLowerCase();
    const path = (dir?.path || '').toLowerCase();

    // Plain text terms: match by directory name
    const free = this.extractFreeText(rawQ).toLowerCase();
    if (free && name.includes(free)) return true;

    // Allow explicit matches if user targeted path or name
    const lp = this.getFieldValue(rawQ, 'localPath');
    if (lp && path.includes(lp.toLowerCase())) return true;

    const nameField = this.getFieldValue(rawQ, 'name');
    if (nameField && name.includes(nameField.toLowerCase())) return true;

    // For other fielded queries (like mainModelName:"..."), directories don't match
    // unless free text remained or path/name was explicitly targeted.
    return !!free; // if there is leftover free text but didn't match name, treat as no-match
  }

  // --- submenu hover helpers (optional; only if your template shows submenus) ---
  onMouseEnterFileViewSubmenu(_: MouseEvent) {
    this.fileViewSubmenuOpen = true;
    setTimeout(() => {
      const el = this.fileViewSubmenuRef?.nativeElement;
      if (!el) return;
      this.fileViewSubmenuShouldFlip = el.getBoundingClientRect().right > window.innerWidth;
    });
  }
  onMouseEnterDirViewSubmenu(_: MouseEvent) {
    this.dirViewSubmenuOpen = true;
    setTimeout(() => {
      const el = this.dirViewSubmenuRef?.nativeElement;
      if (!el) return;
      this.dirViewSubmenuShouldFlip = el.getBoundingClientRect().right > window.innerWidth;
    });
  }

  // --- setters called by your context menu items ---
  switchFilesView(mode: ViewMode) {
    this.filesViewMode = mode;
    this.explorerState.saveFilesViewMode(mode);
    this.fileViewSubmenuOpen = false;
    this.showEmptyAreaContextMenu = false;
    this.cdr.markForCheck();
  }

  switchFoldersView(mode: ViewMode) {
    this.foldersViewMode = mode;
    this.explorerState.saveFoldersViewMode(mode);
    this.dirViewSubmenuOpen = false;
    this.showEmptyAreaContextMenu = false;
    this.cdr.markForCheck();
  }

}