import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-explorer-toolbar',
  templateUrl: './explorer-toolbar.component.html',
  styleUrls: ['./explorer-toolbar.component.scss']
})
export class ExplorerToolbarComponent {
  @Input() currentPath: string | null = null;
  @Input() canGoBack: boolean = false;
  @Input() canGoForward: boolean = false;
  @Output() back = new EventEmitter<void>();
  @Output() forward = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() searchQuery = new EventEmitter<string>();


  // In the future, you can also emit an event for "enter new path"
  // @Output() pathEntered = new EventEmitter<string>();

  onBack() {
    this.back.emit();
  }

  onForward() {
    this.forward.emit();
  }

  onRefresh() {
    this.refresh.emit();
  }

  onSearchChange(value: string) {
    // Emit search text to the parent
    this.searchQuery.emit(value);
  }

}
