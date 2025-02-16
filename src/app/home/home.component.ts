import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
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
import { Subscription } from 'rxjs';
import { HomeRefreshService } from './services/home-refresh.service';
import { PreferencesService } from '../preferences/preferences.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
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

  // For submenus in the empty area menu
  viewSubmenuOpen = false;
  sortSubmenuOpen = false;
  viewSubmenuShouldFlip = false;

  // The file the user right-clicked on (if any)
  selectedFile: DirectoryItem | null = null;

  // Optionally, keep track of all selected files from the file-list component.
  selectedFiles: DirectoryItem[] = [];

  // Add this new property in your HomeComponent class:
  contextFile: DirectoryItem | null = null;

  // New properties for update sidebar
  showUpdateSidebar: boolean = false;
  updateFile: DirectoryItem | null = null;

  // Keep a subscription reference so we can unsubscribe later.
  private homeRefreshSub!: Subscription;

  constructor(
    private electronService: ElectronService,
    private scrollState: ScrollStateService,
    private homeRefreshService: HomeRefreshService,
    private ngZone: NgZone,
    public navigationService: NavigationService,
    public explorerState: ExplorerStateService,
    public recycleService: RecycleService,
    public preferencesService: PreferencesService  // <-- Add this
  ) { }

  ngOnInit() {
    // On re-entering Home, restore window scroll
    setTimeout(() => {
      window.scrollTo(0, this.scrollState.homeScrollPosition);
      console.log('Restored window.scrollY to', this.scrollState.homeScrollPosition);
    }, 0);

    // Subscribe to refresh events
    this.homeRefreshSub = this.homeRefreshService.refresh$.subscribe(() => {
      console.log('Refresh event received from HomeRefreshService.');
      if (this.selectedDirectory) {
        this.onRefresh();
      }
    });

  }

  ngAfterViewInit() {
    // Restore the scroll position after the view has initialized
    window.scrollTo(0, this.scrollState.homeScrollPosition);
    console.log('Restored window.scrollY to', this.scrollState.homeScrollPosition);
  }

  ngOnDestroy() {
    // Save the current scroll offset in the service
    // this.scrollState.homeScrollPosition = window.scrollY;
    // console.log('Stored window.scrollY', this.scrollState.homeScrollPosition);
    if (this.homeRefreshSub) {
      this.homeRefreshSub.unsubscribe();
    }
  }

  // ====== Getters/Setters referencing ExplorerStateService ======
  get selectedDirectory(): string | null {
    return this.explorerState.selectedDirectory;
  }
  set selectedDirectory(val: string | null) {
    this.explorerState.selectedDirectory = val;
  }

  get directoryContents(): DirectoryItem[] {
    return this.explorerState.directoryContents;
  }
  set directoryContents(val: DirectoryItem[]) {
    this.explorerState.directoryContents = val;
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

    const contents = this.explorerState.directoryContents;
    if (!this.searchTerm) return contents;
    const term = this.searchTerm.toLowerCase();
    return contents.filter(item =>
      item.name.toLowerCase().includes(term)
    );
  }

  applySearch(newTerm: string) {
    this.searchTerm = newTerm;
  }

  async openDirectory() {
    const directoryPath = await this.electronService.openDirectoryDialog();
    if (directoryPath) {
      this.ngZone.run(() => {
        this.isLoading = true;
        this.errorMessage = null;
        this.infoMessage = null;
      });

      this.navigationService.navigateTo(directoryPath);
      this.loadDirectoryContents(directoryPath);
    } else {
      this.ngZone.run(() => {
        this.infoMessage = 'Directory selection was canceled.';
      });
    }
  }

  async loadDirectoryContents(directoryPath: string) {
    try {
      // Read the directory asynchronously.
      const files = await fs.promises.readdir(directoryPath);
      if (files.length === 0) {
        this.ngZone.run(() => {
          this.errorMessage = 'The selected directory is empty.';
          this.isLoading = false;
        });
        return;
      }

      // Set the selected directory and load recycle records.
      this.ngZone.run(() => {
        this.selectedDirectory = directoryPath;
      });
      this.recycleService.loadRecords();
      const recycleRecords = this.recycleService.getRecords();

      // Helper function to check if a file is marked as deleted.
      const isFileDeleted = (fullPath: string): boolean =>
        recycleRecords.some(record => record.files.includes(fullPath));

      if (!this.explorerState.enableCivitaiMode) {
        // Normal mode: Process all files with proper error handling.
        const fileItems = await Promise.all(files.map(async file => {
          const fullPath = path.join(directoryPath, file);
          try {
            const stats = await fs.promises.stat(fullPath);
            return {
              name: file,
              path: fullPath,
              isFile: stats.isFile(),
              isDirectory: stats.isDirectory(),
              isDeleted: isFileDeleted(fullPath)
            };
          } catch (statErr) {
            console.error(`Error stating file ${fullPath}:`, statErr);
            // Skip files that cause errors.
            return null;
          }
        }));

        // Filter out any null entries from errors.
        this.ngZone.run(() => {
          this.directoryContents = fileItems.filter(item => item !== null) as DirectoryItem[];
          this.isLoading = false;
        });
      } else {
        // Civitai Mode: Group files based on naming patterns.
        const directories: DirectoryItem[] = [];
        const groupMap = new Map<string, { allFiles: string[]; previewPath?: string }>();

        // Process each file asynchronously.
        await Promise.all(files.map(async file => {
          const fullPath = path.join(directoryPath, file);
          try {
            const stats = await fs.promises.stat(fullPath);
            if (stats.isDirectory()) {
              directories.push({
                name: file,
                path: fullPath,
                isFile: false,
                isDirectory: true,
                isDeleted: isFileDeleted(fullPath)
              });
            } else {
              // Get prefix based on naming convention (e.g., "123_456_SDXL_myModel")
              const prefix = this.getCivitaiPrefix(file);
              if (!prefix) return;

              if (!groupMap.has(prefix)) {
                groupMap.set(prefix, { allFiles: [] });
              }
              groupMap.get(prefix)!.allFiles.push(fullPath);

              // If this file is a preview image, record its path.
              if (file.endsWith('.preview.png')) {
                groupMap.get(prefix)!.previewPath = fullPath;
              }
            }
          } catch (err) {
            console.error(`Error stating file ${fullPath}:`, err);
          }
        }));

        // Build grouped items only if a preview exists.
        const groupedItems: DirectoryItem[] = [];
        groupMap.forEach((group, prefix) => {
          if (group.previewPath) {
            groupedItems.push({
              name: path.basename(group.previewPath),
              path: group.previewPath,
              isFile: true,
              isDirectory: false,
              isDeleted: isFileDeleted(group.previewPath),
              civitaiGroup: group.allFiles
            });
          }
        });

        this.ngZone.run(() => {
          // Combine directories and grouped items.
          this.directoryContents = [
            ...directories,
            ...groupedItems
          ];
          this.isLoading = false;
        });
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

  onRefresh() {
    if (this.selectedDirectory) {
      this.ngZone.run(() => {
        this.isLoading = true;
      });
      this.loadDirectoryContents(this.selectedDirectory);
    }
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
    if (!this.selectedFile) return;

    if (this.selectedFile.civitaiGroup) {
      console.log('[CivitaiMode] Cutting entire set:', this.selectedFile.civitaiGroup);
    } else {
      console.log('Cut file:', this.selectedFile.name);
    }
  }

  copyFile() {
    this.showFileContextMenu = false;
    if (!this.selectedFile) return;

    if (this.selectedFile.civitaiGroup) {
      console.log('[CivitaiMode] Copying entire set:', this.selectedFile.civitaiGroup);
    } else {
      console.log('Copy file:', this.selectedFile.name);
    }
  }

  deleteFiles() {
    this.showFileContextMenu = false;

    // Determine the files to delete:
    const filesToDelete: DirectoryItem[] =
      this.selectedFiles && this.selectedFiles.length > 0
        ? this.selectedFiles
        : (this.contextFile ? [this.contextFile] : []);

    if (filesToDelete.length === 0) return;

    // Check if recycle paths are set
    if (!this.recycleService.arePathsSet) {
      console.warn('Recycle paths are not set. Please set up the recycle path in Preferences.');
      return;
    }

    filesToDelete.forEach(file => {
      const recordType: 'set' | 'directory' = file.isFile ? 'set' : 'directory';
      const record: RecycleRecord = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 8), // create a unique id per file
        type: recordType,
        originalPath: file.path,
        // If this file belongs to a civitai group, you can either store just the file or the entire group,
        // depending on your desired behavior.
        files: file.civitaiGroup && file.civitaiGroup.length ? file.civitaiGroup : [file.path],
        deletedDate: new Date()
      };

      this.recycleService.addRecord(record);
    });

    // Clear selections.
    this.selectedFiles = [];
    this.selectedFile = null;
    this.contextFile = null;

    // Refresh the current directory to update deletion status.
    if (this.selectedDirectory) {
      this.onRefresh();
    }
  }

  restoreFiles() {
    // Hide the context menu.
    this.showFileContextMenu = false;

    // Determine which files to restore.
    const filesToRestore: DirectoryItem[] =
      this.selectedFiles && this.selectedFiles.length > 0
        ? this.selectedFiles
        : (this.contextFile ? [this.contextFile] : []);

    if (filesToRestore.length === 0) return;

    // Gather the file paths.
    const filePaths = filesToRestore.map(file => file.path);

    // Call the new restoreFiles method from the RecycleService.
    this.recycleService.restoreFiles(filePaths);

    // Clear selections.
    this.selectedFiles = [];
    this.selectedFile = null;
    this.contextFile = null;

    // Refresh the current directory to update the deletion status.
    if (this.selectedDirectory) {
      this.onRefresh();
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

}