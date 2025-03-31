import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-virtual-explorer-toolbar',
  templateUrl: './virtual-explorer-toolbar.component.html',
  styleUrls: ['./virtual-explorer-toolbar.component.scss']
})
export class VirtualExplorerToolbarComponent implements OnChanges {
  @Input() currentPath: string | null = '\\ACG\\';
  @Input() canGoBack: boolean = false;
  @Input() canGoForward: boolean = false;
  @Input() isPreloadComplete: boolean = false;
  @Output() back = new EventEmitter<void>();
  @Output() forward = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() searchQuery = new EventEmitter<string>();
  @Output() pathChanged = new EventEmitter<string>();

  isEditingPath = false;
  displayedPath: string = this.currentPath || '';
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

  /** Return an array of path segments, truncated if too deep */
  get truncatedBreadcrumbs(): string[] {
    if (!this.currentPath) {
      return [];
    }
    const parts = this.currentPath.split(/[\\/]/).filter(Boolean);
    const maxSegments = 4;
    if (parts.length <= maxSegments) {
      return parts;
    }
    return ['...', ...parts.slice(parts.length - (maxSegments - 1))];
  }

  enterEditMode(): void {
    this.isEditingPath = true;
  }

  exitEditMode(newPath: string): void {
    this.isEditingPath = false;
    // You could trigger onPathEnter here if desired.
  }

  onPathEnter(newPath: string): void {
    this.isEditingPath = false;
    if (newPath) {
      // Ensure the path ends with a backslash
      if (!newPath.endsWith('\\')) {
        newPath += '\\';
      }
      this.pathChanged.emit(newPath);
    }
  }

  onBreadcrumbClick(index: number, event: MouseEvent): void {
    event.stopPropagation();
    const parts = this.currentPath?.split(/[\\/]/).filter(Boolean) || [];
    if (parts.length === 0) return;
    const maxSegments = 4;
    let actualParts: string[] = parts;
    if (parts.length > maxSegments) {
      const hiddenCount = parts.length - (maxSegments - 1);
      if (index === 0) {
        return;
      } else {
        const realIndex = hiddenCount + (index - 1);
        actualParts = parts.slice(0, realIndex + 1);
      }
    } else {
      actualParts = parts.slice(0, index + 1);
    }
    const partialPath = '\\' + actualParts.join('\\') + '\\';
    this.pathChanged.emit(partialPath);
  }

  onFocus(event: FocusEvent): void {
    const input = event.target as HTMLInputElement;
    input.select();
  }
}
