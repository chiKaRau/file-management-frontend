import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-virtual-explorer-toolbar',
  templateUrl: './virtual-explorer-toolbar.component.html',
  styleUrls: ['./virtual-explorer-toolbar.component.scss']
})
export class VirtualExplorerToolbarComponent implements OnChanges {
  @Input() currentPath: string = '\\ACG\\';
  @Input() canGoBack: boolean = false;
  @Input() canGoForward: boolean = false;
  @Input() isPreloadComplete: boolean = false;
  @Output() back = new EventEmitter<void>();
  @Output() forward = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() searchQuery = new EventEmitter<string>();
  @Output() pathChanged = new EventEmitter<string>();

  isEditingPath = false;
  displayedPath: string = this.currentPath;
  searchText: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentPath) {
      this.displayedPath = changes.currentPath.currentValue;
    }
  }

  onBack(): void {
    this.back.emit();
  }

  onForward(): void {
    this.forward.emit();
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onSearchChange(value: string): void {
    this.searchText = value;
    this.searchQuery.emit(value);
  }

  enterEditMode(): void {
    this.isEditingPath = true;
  }

  exitEditMode(newPath: string): void {
    this.isEditingPath = false;
    if (newPath) {
      if (!newPath.endsWith('\\')) {
        newPath += '\\';
      }
      this.pathChanged.emit(newPath);
    }
  }

  onPathEnter(newPath: string): void {
    this.isEditingPath = false;
    if (newPath) {
      if (!newPath.endsWith('\\')) {
        newPath += '\\';
      }
      this.pathChanged.emit(newPath);
    }
  }

  get breadcrumbs(): string[] {
    if (!this.displayedPath) return [];
    // Remove leading/trailing backslashes and split on "\"
    return this.displayedPath.replace(/^\\|\\$/g, '').split('\\');
  }

  onBreadcrumbClick(index: number, event: MouseEvent): void {
    event.stopPropagation();
    const parts = this.breadcrumbs;
    if (parts.length === 0) return;
    const partialPath = '\\' + parts.slice(0, index + 1).join('\\') + '\\';
    this.pathChanged.emit(partialPath);
  }
}
