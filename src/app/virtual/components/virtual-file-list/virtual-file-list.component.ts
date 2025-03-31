// src/app/virtual/virtual-file-list/virtual-file-list.component.ts
import { Component, Input, Output, EventEmitter, ViewChildren, QueryList, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

@Component({
  selector: 'app-virtual-file-list',
  templateUrl: './virtual-file-list.component.html',
  styleUrls: ['./virtual-file-list.component.scss']
})
export class VirtualFileListComponent implements OnChanges {
  @Input() items: any[] = [];
  @Input() viewMode: string = 'extraLarge';
  @Output() fileSelected: EventEmitter<any> = new EventEmitter<any>();
  @Output() selectionChanged: EventEmitter<any[]> = new EventEmitter<any[]>();
  @Output() openFolder: EventEmitter<string> = new EventEmitter<string>();

  @ViewChildren('fileCard') fileCards!: QueryList<ElementRef>;

  selectedItems: any[] = [];
  lastSelectedIndex: number | null = null;

  constructor(private sanitizer: DomSanitizer) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] || changes['viewMode']) {
      setTimeout(() => this.scrollToSelected(), 0);
    }
  }

  scrollToSelected(): void {
    if (this.selectedItems.length === 1 && this.fileCards) {
      const selectedItem = this.selectedItems[0];
      const index = this.combinedItems.findIndex(item => item.path === selectedItem.path);
      if (index !== -1 && this.fileCards.toArray()[index]) {
        this.fileCards.toArray()[index].nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }

  get directoryItems(): any[] {
    return this.items.filter(item => item.isDirectory);
  }

  get fileItems(): any[] {
    return this.items.filter(item => item.isFile);
  }

  get combinedItems(): any[] {
    return [...this.directoryItems, ...this.fileItems];
  }

  onContainerClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.selectedItems = [];
      this.selectionChanged.emit(this.selectedItems);
    }
  }

  onItemClick(item: any, event: MouseEvent, index: number): void {
    event.stopPropagation();
    const items = this.combinedItems;

    if (event.shiftKey && this.lastSelectedIndex !== null) {
      const start = Math.min(this.lastSelectedIndex, index);
      const end = Math.max(this.lastSelectedIndex, index);
      this.selectedItems = items.slice(start, end + 1);
    } else if (event.ctrlKey || event.metaKey) {
      const idx = this.selectedItems.findIndex(x => x.path === item.path);
      if (idx === -1) {
        this.selectedItems.push(item);
      } else {
        this.selectedItems.splice(idx, 1);
      }
      this.lastSelectedIndex = index;
    } else {
      this.selectedItems = [item];
      this.lastSelectedIndex = index;
    }
    this.selectionChanged.emit(this.selectedItems);
    if (item.isFile) {
      this.fileSelected.emit(item);
    }
  }

  onItemDblClick(item: any): void {
    if (item.isDirectory) {
      // Emit the directory path to open it
      this.openFolder.emit(item.path);
    }
  }

  isSelected(item: any): boolean {
    return this.selectedItems.some(x => x.path === item.path);
  }

  isImage(item: any): boolean {
    return item.imageUrl ? /\.(png|jpe?g|gif|webp)$/i.test(item.imageUrl) : false;
  }

  getBackgroundImage(url: string): SafeStyle {
    let normalized = url.replace(/\\/g, '/');
    if (!normalized.startsWith('file:///') && !normalized.startsWith('http')) {
      normalized = 'file:///' + normalized;
    }
    return this.sanitizer.bypassSecurityTrustStyle(`url("${normalized}")`);
  }
}
