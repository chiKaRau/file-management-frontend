import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DirectoryItem } from '../file-list/model/directory-item.model';
import { ZipService } from '../../services/zip.service';
import * as path from 'path';

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
  currentZipCount: number = 0;
  maxConcurrentZips: number = 5;

  constructor(private zipService: ZipService) { }

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
      // Ignore directories
      if (item.isDirectory) {
        return;
      }
      const setId = this.normalizeSetId(item.name);
      if (!groups.has(setId)) {
        groups.set(setId, { setId, items: [], isZip: false });
      }
      const group = groups.get(setId)!;
      group.items.push(item);
      // Mark as zipped if any file in the group is already a .zip
      if (item.name.toLowerCase().endsWith('.zip')) {
        group.isZip = true;
      } else if (item.civitaiGroup && item.civitaiGroup.some(f => f.toLowerCase().endsWith('.zip'))) {
        group.isZip = true;
      }
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

  selectUnzippedSets(): void {
    const groups = this.groupItems(this.directoryContents);
    // Filter and map each FileGroup to an UnzippedGroup
    this.unzippedGroups = groups
      .filter(group => !group.isZip)
      .map(group => ({
        group: group,
        progress: 0,
        isZipping: false
      }));

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

  async zipGroup(item: UnzippedGroup): Promise<void> {
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
      // Increase progress gradually up to 95%
      if (item.progress < 95) {
        item.progress++;
      }
    }, 100); // Adjust the interval (in ms) as desired

    try {
      await this.zipService.zipFiles(filesToZip, outputZipPath, (progress: number) => {
        // Optionally, you could update with actual progress if it's granular:
        // item.progress = progress;
      });
      clearInterval(progressTimer);
      item.progress = 100;
    } catch (err) {
      clearInterval(progressTimer);
      console.error('Zipping error:', err);
      item.error = 'Zip failed, click Retry';
      item.progress = 0;
    } finally {
      item.isZipping = false;
      this.currentZipCount--;
      console.log(`Zip complete/finalized for ${group.setId}. Active: ${this.currentZipCount}`);
    }
  }

}
