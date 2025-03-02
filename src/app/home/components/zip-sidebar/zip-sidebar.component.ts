import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DirectoryItem } from '../file-list/model/directory-item.model';
import { ZipService } from '../../services/zip.service';
import * as path from 'path';
import * as fs from 'fs';
import trash from 'trash';
import { HomeRefreshService } from '../../services/home-refresh.service';


interface FileGroup {
  setId: string;
  items: DirectoryItem[];
  isZip: boolean;
}

interface UnzippedGroup {
  group: FileGroup;
  progress: number;      // 0 to 100
  isZipping: boolean;
  error?: string;
}

@Component({
  selector: 'app-zip-sidebar',
  templateUrl: './zip-sidebar.component.html',
  styleUrls: ['./zip-sidebar.component.scss']
})
export class ZipSidebarComponent {
  @Input() directoryContents: DirectoryItem[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() selectSetsEvent = new EventEmitter<DirectoryItem[]>();

  unzippedGroups: UnzippedGroup[] = [];

  // Store the original unzipped groups before any zipping occurs.
  initialUnzippedGroups: UnzippedGroup[] = [];

  currentZipCount: number = 0;
  maxConcurrentZips: number = 5;

  // Flag indicating if the "Zip All" process is running.
  isZippingAll: boolean = false;

  // This flag will be set to true when all zipping operations have completed.
  zippingCompleted: boolean = false;

  constructor(private zipService: ZipService,
    private homeRefreshService: HomeRefreshService) { }

  close(): void {
    this.closed.emit();
  }

  /**
   * Group files by a normalized set id so that all files with the same base name 
   * (ignoring extensions and preview markers) are grouped together.
   */
  private groupItems(items: DirectoryItem[]): FileGroup[] {
    const groups = new Map<string, FileGroup>();
    items.forEach(item => {
      if (item.isDirectory) return;
      const setId = this.normalizeSetId(item.name);
      // Determine the target directory from the item
      const targetDir = path.dirname(item.path);
      // Build the expected ZIP file path
      const expectedZip = path.join(targetDir, setId + '.zip');
      // Check if the ZIP file exists in the directory
      const zipExists = fs.existsSync(expectedZip);

      if (!groups.has(setId)) {
        groups.set(setId, { setId, items: [], isZip: zipExists });
      } else {
        const group = groups.get(setId)!;
        // If any item finds that the ZIP exists, update the flag.
        if (zipExists) {
          group.isZip = true;
        }
      }
      groups.get(setId)!.items.push(item);
    });
    console.log('Grouped Items:', Array.from(groups.entries()));
    return Array.from(groups.values());
  }

  /**
   * Normalize file names by removing extensions.
   * - If a file ends with '.civitai.info', remove that full extension.
   * - If the file contains '.preview', remove that segment and anything after.
   * - Otherwise, remove the standard extension.
   */
  private normalizeSetId(fileName: string): string {
    const lowerFile = fileName.toLowerCase();

    // Remove the full multi-part extension for civitai.info
    if (lowerFile.endsWith('.civitai.info')) {
      return lowerFile.slice(0, -('.civitai.info'.length));
    }
    // For preview images, remove the .preview segment and anything after it.
    if (lowerFile.includes('.preview')) {
      return lowerFile.split('.preview')[0];
    }
    // Default: remove the extension (e.g., .png, .safetensor)
    return lowerFile.replace(path.extname(lowerFile), '');
  }

  selectUnzippedSets(resetFlags: boolean = true): void {
    // Filter out ZIP files from directoryContents.
    const unzippedItems = this.directoryContents.filter(item =>
      !item.isDirectory && !item.name.toLowerCase().endsWith('.zip')
    );
    const groups = this.groupItems(unzippedItems);
    this.unzippedGroups = groups
      .filter(group => !group.isZip)
      .map(group => ({
        group: group,
        progress: 0,
        isZipping: false
      }));

    // Only set initialUnzippedGroups if not already set.
    if (!this.initialUnzippedGroups || this.initialUnzippedGroups.length === 0) {
      this.initialUnzippedGroups = [...this.unzippedGroups];
    }

    if (resetFlags) {
      this.zippingCompleted = false; // only reset if needed
      this.isZippingAll = false;
    }

    // Flatten the items from each unzipped group into a single array if needed
    const itemsToSelect: DirectoryItem[] = [];
    this.unzippedGroups.forEach(unzippedGroup => {
      itemsToSelect.push(...unzippedGroup.group.items);
    });
    this.selectSetsEvent.emit(itemsToSelect);
  }


  getThumbnail(group: FileGroup): string {
    const preview = group.items.find(item => item.name.toLowerCase().includes('preview'));
    return preview ? preview.path : '';
  }

  async zipGroup(item: UnzippedGroup, force: boolean = false): Promise<void> {
    // If not forcing and individual button was clicked while Zip All is in progress, return.
    if (!force && this.isZippingAll) {
      console.log("Zipping All now. So return");
      return;
    }
    if (item.isZipping) return;
    if (this.currentZipCount >= this.maxConcurrentZips) {
      item.error = `Max concurrent zips reached (${this.maxConcurrentZips}). Please wait.`;
      return;
    }

    const group = item.group;
    let filesToZip: string[] = [];

    // Use civitaiGroup if available and complete.
    if (
      group.items.length === 1 &&
      group.items[0].civitaiGroup &&
      group.items[0].civitaiGroup.length >= 3
    ) {
      filesToZip = group.items[0].civitaiGroup;
    } else {
      filesToZip = group.items.map(f => f.path);
    }

    // Check for required file types.
    const lowerPaths = filesToZip.map(p => p.toLowerCase());
    const hasPreview = lowerPaths.some(p => p.includes('.preview'));
    const hasCivitai = lowerPaths.some(p => p.endsWith('.civitai.info'));
    const hasSafetensors = lowerPaths.some(p => p.endsWith('.safetensors'));

    if (!hasPreview || !hasCivitai || !hasSafetensors) {
      item.error = 'This is not complete set';
      console.error('Incomplete set for group:', group.setId, filesToZip);
      return;
    }

    const targetDir = path.dirname(filesToZip[0]);
    const outputZipPath = path.join(targetDir, group.setId + '.zip');

    item.isZipping = true;
    item.error = undefined;
    item.progress = 0;
    this.currentZipCount++;
    console.log(`Starting zip for ${group.setId}. Active: ${this.currentZipCount}`);

    // Start a simulated progress timer.
    const progressTimer = setInterval(() => {
      if (item.progress < 95) {
        item.progress++;
      }
    }, 100);

    try {
      await this.zipService.zipFiles(filesToZip, outputZipPath, (progress: number) => {
        // Optionally update with actual progress if available.
      });
      clearInterval(progressTimer);
      item.progress = 100;

      const previewExtensions = ['.preview.png', '.preview.jpg'];


      // Update the group's items:
      // 1) Remove from group.items
      const previewItems = group.items.filter(i => {
        const lower = i.name.toLowerCase();
        return previewExtensions.some(ext => lower.endsWith(ext));
      });

      // 2. Create a new item for the zip file.
      const zipItem = {
        name: group.setId + '.zip',
        path: outputZipPath,
        isFile: true,
        isDirectory: false,
        isDeleted: false,
        civitaiGroup: []
      };

      // 2) Remove from each item’s civitaiGroup as well
      for (const item of group.items) {
        const cg = item.civitaiGroup ?? [];
        // The ones to remove are anything that doesn't end with preview
        const filesToRemove = cg.filter(
          filePath => !previewExtensions.some(ext => filePath.toLowerCase().endsWith(ext))
        );

        // Move them to trash
        for (const filePath of filesToRemove) {
          await trash(filePath);
          console.log('Trashed file:', filePath);
        }

        // If you want to remove them from item.civitaiGroup after trashing:
        item.civitaiGroup = cg.filter(
          filePath => previewExtensions.some(ext => filePath.toLowerCase().endsWith(ext))
        );
      }

      // 3) Finally, update group.items to have only the preview + new zip
      group.items = [...previewItems, zipItem];
      group.isZip = true;
    } catch (err) {
      clearInterval(progressTimer);
      console.error('Zipping error:', err);
      item.error = 'Zip failed, click Retry';
      item.progress = 0;
    } finally {
      item.isZipping = false;
      this.currentZipCount--;
      console.log(`Zip complete/finalized for ${group.setId}. Active: ${this.currentZipCount}`);
      // Only refresh UI if not forced (i.e. if it was an individual operation)
      if (!force) {
        this.homeRefreshService.triggerRefresh();
        this.selectUnzippedSets(true);
      }
    }

  }

  /**
   * Zips all unzipped groups sequentially (one by one).
   */
  async zipAll(): Promise<void> {
    this.isZippingAll = true;
    const groupsToZip = this.unzippedGroups.filter(item => item.progress !== 100);
    for (const groupItem of groupsToZip) {
      await this.zipGroup(groupItem, true); // force=true to bypass the isZippingAll check
    }
    this.zippingCompleted = true;
    this.isZippingAll = false;
    // Now update the UI only once
    this.homeRefreshService.triggerRefresh();
    // Do not reset zippingCompleted now:
    this.selectUnzippedSets(false);
  }

  // Sidebar computed values:

  // Helper method to check individual group integrity.
  checkGroupIntegrity(unzipped: UnzippedGroup): string {
    const group = unzipped.group;
    if (group.items.length === 0) return 'Mismatch';
    const targetDir = path.dirname(group.items[0].path);
    const expectedZip = path.join(targetDir, group.setId + '.zip');
    const zipExists = fs.existsSync(expectedZip);
    let filesInDir: string[] = [];
    try {
      filesInDir = fs.readdirSync(targetDir);
    } catch (err) {
      console.error('Error reading directory:', targetDir, err);
    }
    const previewExists = filesInDir.some(filename => {
      return filename.toLowerCase().includes(group.setId.toLowerCase()) &&
        filename.toLowerCase().endsWith('.png');
    });
    return zipExists && previewExists ? 'Valid' : 'Mismatch';
  }

  // Computed status values using the original unzipped sets.
  /** Total number of sets */
  get totalSets(): number {
    return this.initialUnzippedGroups.length;
  }

  /**
   * Total original files = totalSets × 3 (each set originally has .png, .civitai.info, .safetensors).
   */
  get totalOriginalFiles(): number {
    return this.totalSets * 3;
  }

  /**
   * Expected output files = totalSets × 2 (each zipped set should have a .zip and a preview .png).
   */
  get expectedOutputFiles(): number {
    return this.totalSets * 2;
  }


  /**
   * Scans the directory for each set and returns an array of invalid sets with error messages.
   */
  getInvalidSets(): { setId: string; message: string }[] {
    const invalidSets: { setId: string; message: string }[] = [];
    this.initialUnzippedGroups.forEach(unzipped => {
      const group = unzipped.group;
      if (group.items.length === 0) return;
      const targetDir = path.dirname(group.items[0].path);
      const expectedZip = path.join(targetDir, group.setId + '.zip');
      const zipExists = fs.existsSync(expectedZip);

      let filesInDir: string[] = [];
      try {
        filesInDir = fs.readdirSync(targetDir);
      } catch (err) {
        console.error('Error reading directory:', targetDir, err);
      }

      const previewExists = filesInDir.some(filename => {
        return filename.toLowerCase().includes(group.setId.toLowerCase()) &&
          filename.toLowerCase().endsWith('.png');
      });

      if (!zipExists || !previewExists) {
        let missing = [];
        if (!zipExists) missing.push('ZIP file');
        if (!previewExists) missing.push('Preview PNG');
        invalidSets.push({
          setId: group.setId,
          message: `Missing ${missing.join(' and ')}`
        });
      }
    });
    return invalidSets;
  }

  /**
   * Scans the directory to count the current output files.
   */
  scanDirectoryForOutputFiles(): number {
    let totalFound = 0;
    this.initialUnzippedGroups.forEach(unzipped => {
      const group = unzipped.group;
      if (group.items.length === 0) return;
      const targetDir = path.dirname(group.items[0].path);
      const expectedZip = path.join(targetDir, group.setId + '.zip');
      if (fs.existsSync(expectedZip)) totalFound++;

      let filesInDir: string[] = [];
      try {
        filesInDir = fs.readdirSync(targetDir);
      } catch (err) {
        console.error('Error reading directory:', targetDir, err);
      }
      const previewFound = filesInDir.some(filename => {
        return filename.toLowerCase().includes(group.setId.toLowerCase()) &&
          filename.toLowerCase().endsWith('.png');
      });
      if (previewFound) totalFound++;
    });
    return totalFound;
  }
}
