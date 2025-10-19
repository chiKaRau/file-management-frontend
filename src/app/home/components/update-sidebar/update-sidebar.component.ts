// update-sidebar.component.ts
import { Component, HostBinding, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { DirectoryItem } from '../file-list/model/directory-item.model';
import { SearchProgress, SearchService } from '../../services/search.service';
import { RecycleService } from '../../../recycle/recycle.service';
import { HomeRefreshService } from '../../services/home-refresh.service';

interface CivitaiSet {
  setId: string;
  items: DirectoryItem[];
  isZip: boolean;
  previewPath?: string;
  folderPath?: string;
  isProcessing?: boolean;
  moveProgress?: number; // 0 to 100
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

  constructor(private searchService: SearchService,
    private recycleService: RecycleService,
    private homeRefreshService: HomeRefreshService) { }

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
          // Final grouping with filtering out the selected set.
          const groups = this.groupItems(this.foundItems);
          if (this.item) {
            const selectedSetId = this.normalizeSetId(this.item.name);
            this.groupedItems = groups.filter(group => group.setId !== selectedSetId);
          } else {
            this.groupedItems = groups;
          }
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

  // Moves a file from src to dest asynchronously. If rename fails, tries copy+unlink.
  async moveFileAsync(src: string, dest: string): Promise<void> {
    // Ensure destination directory exists.
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      await fs.promises.mkdir(destDir, { recursive: true });
    }

    console.log("Attempting to move file:", src, "to", dest);

    if (!fs.existsSync(src)) {
      throw new Error(`Source file does not exist: ${src}`);
    }

    try {
      await fs.promises.rename(src, dest);
    } catch (err) {
      console.error("Rename failed, trying fallback for", src, err);
      try {
        await fs.promises.copyFile(src, dest);
        await fs.promises.unlink(src);
      } catch (fallbackErr) {
        console.error("Fallback failed for", src, fallbackErr);
        throw fallbackErr;
      }
    }
  }

  // Given a source file path, compute the target production path.
  // We assume that production files are in the ACG folder.
  // If the file path contains "\update\", we replace it with "\ACG\".
  getProductionTarget(src: string): string {
    const productionFolder = '\\ACG\\';
    // If the src contains "\update\", replace it; otherwise, always move into the production folder.
    if (src.toLowerCase().includes("\\update\\")) {
      return src.replace(/\\update\\/i, productionFolder);
    }
    return path.join(productionFolder, path.basename(src));
  }

  // Compute the delete target by moving the file into the delete folder.
  // We assume that RecycleService exposes a getter for deleteFolderPath.
  getDeleteTarget(src: string): string {
    const deleteFolder = this.recycleService.getDeleteFolderPath(); // Ensure this getter exists in RecycleService
    return path.join(deleteFolder, path.basename(src));
  }

  // =================== Upgrade Operation ===================
  async upgradeSet(set: CivitaiSet): Promise<void> {
    if (
      !window.confirm(
        "Are you sure you want to upgrade this set? This will replace production files with the update version and back up the old files."
      )
    ) {
      return;
    }
    set.isProcessing = true;
    set.moveProgress = 0;

    // Determine the update directory and set id from the selected file.
    const updateDir = this.item ? path.dirname(this.item.path) : "";
    const setId = this.item ? this.normalizeSetId(this.item.name) : "";
    if (!updateDir || !setId) {
      alert("Invalid update file.");
      set.isProcessing = false;
      return;
    }

    // Use the production folder determined from the search results.
    const productionDir = set.folderPath;
    if (!productionDir) {
      alert("Production folder not determined.");
      set.isProcessing = false;
      return;
    }

    // Read the update directory to get all files belonging to this set.
    let updateFiles: string[] = [];
    try {
      const files = await fs.promises.readdir(updateDir);
      updateFiles = files
        .filter((f) => this.normalizeSetId(f) === setId)
        .map((f) => path.join(updateDir, f));
    } catch (err) {
      console.error("Error reading update directory", err);
      alert("Error reading update directory.");
      set.isProcessing = false;
      return;
    }

    // We'll move both the production files (to back them up) and the update files.
    const total = updateFiles.length + set.items.length;
    let movedCount = 0;
    const errors: string[] = [];

    // 1. Move any existing production files (from the result set) to the delete folder.
    for (const prod of set.items) {
      const prodPath = prod.path;
      if (fs.existsSync(prodPath)) {
        const deleteTarget = this.getDeleteTarget(prodPath);
        console.log("Backing up production file:", prodPath, "->", deleteTarget);
        try {
          await this.moveFileAsync(prodPath, deleteTarget);
          movedCount++;
          set.moveProgress = Math.round((movedCount / total) * 100);
        } catch (err) {
          errors.push(prodPath);
          console.error("Error moving production file", prodPath, err);
        }
      }
    }

    // 2. Move all update files to the production folder.
    for (const src of updateFiles) {
      // Build the target path using the production folder from the result set.
      const target = path.join(productionDir, path.basename(src));
      console.log("Moving update file:", src, "->", target);
      try {
        await this.moveFileAsync(src, target);
        movedCount++;
        set.moveProgress = Math.round((movedCount / total) * 100);
      } catch (err) {
        errors.push(src);
        console.error("Error moving update file", src, err);
      }
    }

    if (errors.length > 0) {
      alert(
        `Upgrade completed with errors. The following files could not be upgraded:\n${errors.join(
          "\n"
        )}`
      );
    } else {
      alert("Upgrade completed successfully.");
    }

    set.isProcessing = false;
    set.moveProgress = 0;
    // Trigger a refresh to update the home view.
    this.homeRefreshService.triggerRefresh();
  }

  async deleteSet(set: CivitaiSet): Promise<void> {
    if (!window.confirm("Are you sure you want to delete this set? This will move all files to the delete folder.")) {
      return;
    }
    set.isProcessing = true;
    set.moveProgress = 0;
    const files = set.items.map(item => item.path);
    const total = files.length;
    let movedCount = 0;
    const errors: string[] = [];

    for (let src of files) {
      try {
        // Ensure destination directory exists inside moveFileAsync.
        await this.moveFileAsync(src, this.getDeleteTarget(src));
        movedCount++;
      } catch (err) {
        errors.push(src);
        console.error("Error moving file", src, err);
      }
      // Update progress after each file
      set.moveProgress = Math.round((movedCount / total) * 100);
    }

    if (errors.length > 0) {
      alert(`Delete completed with errors. The following files could not be moved:\n${errors.join("\n")}`);
    } else {
      alert("Delete completed successfully.");
    }

    set.isProcessing = false;
    set.moveProgress = 0;
    // Trigger a refresh so that home no longer shows the deleted set
    this.homeRefreshService.triggerRefresh();
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

  getModelLink(setId: string): string {
    const parts = setId.split('_');
    if (parts.length >= 2) {
      const modelID = parts[0];
      const versionID = parts[1];
      return `https://civitai.com/models/${modelID}?modelVersionId=${versionID}`;
    }
    return '';
  }

  revealFolder(folderPath: string) {
    if (!folderPath) return;

    // Electron path (works if nodeIntegration is enabled)
    try {
      const shell = (window as any)?.require?.('electron')?.shell;
      if (shell) {
        shell.openPath(folderPath).then((err: string) => {
          if (err) {
            // if folder open failed or it's actually a file, reveal it instead
            shell.showItemInFolder(folderPath);
          }
        });
        return;
      }
    } catch { /* ignore */ }

    // Web fallback (often blocked, but harmless)
    try { window.open(this.pathToFileUrl(folderPath), '_blank'); } catch { /* ignore */ }
  }

  pathToFileUrl(p: string): string {
    let norm = String(p).replace(/\\/g, '/');         // Windows backslashes → slashes
    if (/^[a-zA-Z]:\//.test(norm)) norm = '/' + norm; // ensure /C:/...
    return 'file://' + encodeURI(norm);
  }

  copyText(text: string | null | undefined) {
    if (!text || text === '—') return;
    navigator.clipboard?.writeText(String(text)).catch(() => { });
  }

  // --- parse helpers (format: {modelId}_{versionId}_{baseModel}_{name...})
  private parseVersionId(s: string | undefined | null): string | null {
    if (!s) return null;
    const parts = s.split('_');
    return parts.length >= 2 ? parts[1] : null;
  }
  private parseBaseModel(s: string | undefined | null): string | null {
    if (!s) return null;
    const parts = s.split('_');
    return parts.length >= 3 ? parts[2] : null;
  }

  // getters for the currently selected "Name:"
  get itemVersionId(): string | null {
    return this.item ? this.parseVersionId(this.item.name) : null;
  }
  get itemBaseModel(): string | null {
    return this.item ? this.parseBaseModel(this.item.name) : null;
  }

  // per-set readers (for "Set:")
  versionFrom(set: CivitaiSet): string | null {
    return this.parseVersionId(set?.setId);
  }
  baseFrom(set: CivitaiSet): string | null {
    return this.parseBaseModel(set?.setId);
  }

  baseModelMatches(set: CivitaiSet): boolean {
    const a = (this.baseFrom(set) || '').trim().toLowerCase();
    const b = (this.itemBaseModel || '').trim().toLowerCase();
    return !!a && !!b && a === b;
  }



}
