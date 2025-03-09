import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DirectoryItem } from './model/directory-item.model';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

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

  constructor(private sanitizer: DomSanitizer) { }

  /**
 * Returns the parsed stats for the given item.
 */
  getParsedStats(item: DirectoryItem): any {
    try {
      console.log(item.scanData)
      // If the scanData and stats property exist, parse the JSON
      return item.scanData && item.scanData.stats ? JSON.parse(item.scanData.stats) : {};
    } catch (error) {
      console.error('Error parsing stats for item', item, error);
      return {};
    }
  }

  getBackgroundImage(originalPath: string): SafeStyle {
    // 1) Convert backslashes to forward slashes:
    let normalized = originalPath.replace(/\\/g, '/');

    // 2) Prepend file:/// if not present
    if (!normalized.startsWith('file:///')) {
      normalized = 'file:///' + normalized;
    }

    // 3) Optionally encode spaces, parentheses, etc.
    //    For example, encodeURI on the portion after file:///
    //    but be careful not to double-encode. A simple approach:
    // 
    //    const prefix = 'file:///';
    //    const pathPart = normalized.slice(prefix.length);
    //    normalized = prefix + encodeURI(pathPart);
    // 
    // 4) Use DomSanitizer to mark the style as safe
    return this.sanitizer.bypassSecurityTrustStyle(`url("${normalized}")`);
  }
  /**
   * Handles click events on file items.
   * - Shift+click: select all items between the last clicked and the current item.
   * - Ctrl+click: toggle the selection.
   * - Regular click: clear previous selection and select the clicked item.
   */
  onItemClick(item: DirectoryItem, event: MouseEvent, index: number) {
    event.stopPropagation(); // Prevent the container's click from firing

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

  onFileRightClick(file: DirectoryItem, event: MouseEvent): void {
    event.preventDefault();
    // If the file isn’t already selected, select it.
    if (!this.selectedItems.includes(file)) {
      this.selectedItems = [file];
      // Optionally update lastSelectedIndex here.
      const idx = this.items.indexOf(file);
      this.lastSelectedIndex = idx;
      this.selectionChanged.emit(this.selectedItems);
    }
    this.fileRightClick.emit({ file, event });
  }

  // In file-list.component.ts (inside the FileListComponent class)
  // In file-list.component.ts (inside FileListComponent class)
  public selectItemByPrefix(prefix: string): void {
    const lowerPrefix = prefix.toLowerCase();
    if (!lowerPrefix) {
      return;
    }

    // Check if the prefix consists of one repeated character.
    const isRepeatedLetter = lowerPrefix.split('').every(char => char === lowerPrefix[0]);

    if (isRepeatedLetter) {
      // For example, if the user typed "b" or "bb" or "bbb"
      const letter = lowerPrefix[0];
      // Get all items whose names start with the letter.
      const matches = this.items.filter(item => item.name.toLowerCase().startsWith(letter));
      if (matches.length > 0) {
        // The cycle index is determined by the number of key presses.
        // (For "b" -> count=1, so index 0; for "bb" -> count=2, so index 1; etc.)
        const cycleIndex = (lowerPrefix.length - 1) % matches.length;
        const selected = matches[cycleIndex];

        // Update selection state
        this.selectedItems = [selected];
        this.lastSelectedIndex = this.items.indexOf(selected);
        this.selectionChanged.emit(this.selectedItems);
        console.log(`Cycling typeahead: prefix "${prefix}" selected "${selected.name}"`);
      }
    } else {
      // Normal multi-character prefix search.
      const found = this.items.find(item => item.name.toLowerCase().startsWith(lowerPrefix));
      if (found) {
        this.selectedItems = [found];
        this.lastSelectedIndex = this.items.indexOf(found);
        this.selectionChanged.emit(this.selectedItems);
        console.log(`Typeahead: prefix "${prefix}" selected "${found.name}"`);
      }
    }
  }

  isSelected(item: DirectoryItem): boolean {
    return this.selectedItems.indexOf(item) !== -1;
  }

  isImage(item: DirectoryItem): boolean {
    // Basic check if extension is .png/.jpg/.jpeg/.gif, etc.
    return /\.(png|jpe?g|gif|webp)$/i.test(item.name);
  }

  get directoryItems(): DirectoryItem[] {
    return this.items.filter(item => item.isDirectory);
  }

  get fileItems(): DirectoryItem[] {
    console.log("Testing")
    console.log(this.items)
    return this.items.filter(item => item.isFile);
  }


}