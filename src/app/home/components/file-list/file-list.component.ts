import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DirectoryItem } from './model/directory-item.model';

@Component({
  selector: 'app-file-list',
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.scss']
})
export class FileListComponent {
  @Input() items: DirectoryItem[] = [];
  @Input() viewMode: string = 'large'; // default to "large"

  /** Emitted when user wants to open a folder (double-click). */
  @Output() openFolder = new EventEmitter<string>();

  /** Emitted on right-click, so parent can show context menu. */
  @Output() fileRightClick = new EventEmitter<{ file: DirectoryItem; event: MouseEvent }>();

  /** Optional single-click event if parent wants to know. */
  @Output() itemClicked = new EventEmitter<DirectoryItem>();

  /** Emitted when the selection changes. */
  @Output() selectionChanged = new EventEmitter<DirectoryItem[]>();

  /** Which file is hovered (for styling)? */
  hoveredItem: DirectoryItem | null = null;

  // Maintain an array of selected items.
  selectedItems: DirectoryItem[] = [];

  // Track the index of the last clicked item.
  lastSelectedIndex: number | null = null;

  onContainerClick(event: MouseEvent) {
    // If the click is directly on the container (and not on a child element), clear selection.
    if (event.target === event.currentTarget) {
      this.selectedItems = [];
      this.selectionChanged.emit(this.selectedItems);
      console.log('Cleared selection by clicking empty space.');
    }
  }

  /**
   * Handles click events on file items.
   * - Shift+click: select all items between the last clicked and the current item.
   * - Ctrl+click: toggle the selection.
   * - Regular click: clear previous selection and select the clicked item.
   */
  onItemClick(item: DirectoryItem, event: MouseEvent, index: number) {
    if (event.shiftKey && this.lastSelectedIndex !== null) {
      // Determine the range between lastSelectedIndex and the current index.
      const start = Math.min(this.lastSelectedIndex, index);
      const end = Math.max(this.lastSelectedIndex, index);
      // Select the items in that range.
      this.selectedItems = this.items.slice(start, end + 1);
    } else if (event.ctrlKey) {
      // Toggle the clicked item in the selection.
      const existingIndex = this.selectedItems.indexOf(item);
      if (existingIndex === -1) {
        this.selectedItems.push(item);
      } else {
        this.selectedItems.splice(existingIndex, 1);
      }
      // Update lastSelectedIndex to the index of the toggled item.
      this.lastSelectedIndex = index;
    } else {
      // Regular click: clear selection and select only this item.
      this.selectedItems = [item];
      this.lastSelectedIndex = index;
    }
    this.selectionChanged.emit(this.selectedItems);
    console.log('Current selection:', this.selectedItems.map(i => i.name));
  }

  onItemDblClick(item: DirectoryItem) {
    // Double-click => if it's a directory, emit openFolder
    if (item.isDirectory) {
      this.openFolder.emit(item.path);
    } else {
      console.log('Double-clicked file:', item.name);
    }
  }

  onFileRightClick(file: DirectoryItem, event: MouseEvent) {
    event.preventDefault();
    // If the file isn’t already selected, then select it.
    if (!this.selectedItems.includes(file)) {
      this.selectedItems = [file];
      this.selectionChanged.emit(this.selectedItems);
    }
    this.fileRightClick.emit({ file, event });
  }

  isSelected(item: DirectoryItem): boolean {
    return this.selectedItems.indexOf(item) !== -1;
  }

  isImage(item: DirectoryItem): boolean {
    // Basic check if extension is .png/.jpg/.jpeg/.gif, etc.
    return /\.(png|jpe?g|gif|webp)$/i.test(item.name);
  }
}