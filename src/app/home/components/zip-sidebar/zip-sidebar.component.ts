import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DirectoryItem } from '../file-list/model/directory-item.model';

interface FileGroup {
  setId: string;
  items: DirectoryItem[];
  isZip: boolean;
}

@Component({
  selector: 'app-zip-sidebar',
  templateUrl: './zip-sidebar.component.html',
  styleUrls: ['./zip-sidebar.component.scss']
})
export class ZipSidebarComponent {
  // Input: current directory files from the parent (your explorer)
  @Input() directoryContents: DirectoryItem[] = [];
  // Output: when closing the sidebar
  @Output() closed = new EventEmitter<void>();
  // Output: emit the list of items from groups that do NOT have a .zip file
  @Output() selectSetsEvent = new EventEmitter<DirectoryItem[]>();

  close(): void {
    this.closed.emit();
  }

  /**
   * Group items by a set ID derived from the file name (everything before the first dot).
   * A group is considered "zipped" if any item in the group (or any file in its civitaiGroup, if present)
   * ends with '.zip'.
   */
  private groupItems(items: DirectoryItem[]): FileGroup[] {
    const groups = new Map<string, FileGroup>();
    items.forEach(item => {
      const setId = this.normalizeSetId(item.name);
      if (!groups.has(setId)) {
        groups.set(setId, { setId, items: [], isZip: false });
      }
      const group = groups.get(setId)!;
      group.items.push(item);
      // Check the item's own name first...
      if (item.name.toLowerCase().endsWith('.zip')) {
        group.isZip = true;
      }
      // Then also check if there is a civitaiGroup array and any member ends with ".zip"
      else if (item.civitaiGroup && item.civitaiGroup.some(f => f.toLowerCase().endsWith('.zip'))) {
        group.isZip = true;
      }
    });
    return Array.from(groups.values());
  }

  /**
   * Normalize a file name by taking the substring up to the first dot.
   */
  private normalizeSetId(fileName: string): string {
    const dotIndex = fileName.indexOf('.');
    return dotIndex === -1 ? fileName : fileName.substring(0, dotIndex);
  }

  /**
   * When the button is clicked, find all groups that do NOT have any .zip file,
   * flatten the items from those groups, and emit the result.
   */
  selectUnzippedSets(): void {
    const groups = this.groupItems(this.directoryContents);
    console.log('All groups:', groups);
    // Only select groups that lack a .zip file
    const unzippedGroups = groups.filter(group => !group.isZip);
    console.log('Unzipped groups:', unzippedGroups);
    // Flatten the items from each unzipped group into a single array
    const itemsToSelect: DirectoryItem[] = [];
    unzippedGroups.forEach(group => {
      itemsToSelect.push(...group.items);
    });
    console.log('Items to select:', itemsToSelect);
    this.selectSetsEvent.emit(itemsToSelect);
  }
}
