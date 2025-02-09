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

  /** Which file is hovered (for styling)? */
  hoveredItem: DirectoryItem | null = null;

  /** Which file is selected (single-click)? */
  selectedItem: DirectoryItem | null = null;

  onItemClick(item: DirectoryItem) {
    // Single-click => select item
    this.selectedItem = item;
    this.itemClicked.emit(item);
    console.log('Single-click on:', item.name);
  }

  onItemDblClick(item: DirectoryItem) {
    // Double-click => if it's a directory, emit openFolder
    if (item.isDirectory) {
      this.openFolder.emit(item.path);
    } else {
      console.log('Double-clicked file:', item.name);
    }
  }

  // Make sure the order in your template matches:
  // In the HTML, we have (contextmenu)="onFileRightClick(item, $event)"
  // => So we define "file: DirectoryItem" first, then "event: MouseEvent"
  onFileRightClick(file: DirectoryItem, event: MouseEvent) {
    event.preventDefault();
    this.fileRightClick.emit({ file, event });
  }

  isImage(item: DirectoryItem): boolean {
    // Basic check if extension is .png/.jpg/.jpeg/.gif, etc.
    return /\.(png|jpe?g|gif|webp)$/i.test(item.name);
  }
}