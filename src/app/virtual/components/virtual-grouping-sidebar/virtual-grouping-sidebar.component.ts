import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-virtual-grouping-sidebar',
  templateUrl: './virtual-grouping-sidebar.component.html',
  styleUrls: ['./virtual-grouping-sidebar.component.scss']
})
export class VirtualGroupingSidebarComponent implements OnChanges {
  // Aggregated options passed in from the parent.
  @Input() aggregatedOptions: { [key: string]: string[] } = {};
  @Output() closed = new EventEmitter<void>();

  // Group headers. For example, you might filter out "Name" if unnecessary.
  groupKeys: string[] = [];
  // Flag to track expanded/collapsed state for the list.
  listExpanded: boolean = false;
  // Set of tokens selected (to be displayed in the input box).
  selectedTokens: Set<string> = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.aggregatedOptions) {
      // For the sidebar, exclude any group you don't want (here, for example, "Name"),
      // and force "All" to be at the top.
      this.groupKeys = Object.keys(this.aggregatedOptions)
        .filter(key => key !== 'Name')
        .sort((a, b) => {
          if (a === 'All') { return -1; }
          if (b === 'All') { return 1; }
          return a.localeCompare(b);
        });
    }
  }

  // Toggle token selection: add it if not present, remove if present.
  toggleToken(token: string): void {
    if (this.selectedTokens.has(token)) {
      this.selectedTokens.delete(token);
    } else {
      this.selectedTokens.add(token);
    }
  }

  // Check if a token is already selected.
  isTokenSelected(token: string): boolean {
    return this.selectedTokens.has(token);
  }

  // Build a comma-separated string from the selected tokens for display.
  getSelectedTokensAsString(): string {
    return Array.from(this.selectedTokens).join(', ');
  }

  // Toggle the expand/collapse state of the list.
  toggleList(): void {
    this.listExpanded = !this.listExpanded;
  }

  // Emit the close event when needed.
  close(): void {
    this.closed.emit();
  }
}
