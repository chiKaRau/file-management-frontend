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
  // NEW: Emit selected tokens array so parent can filter files.
  @Output() tokensChanged = new EventEmitter<string[]>();

  // NEW: Event emitted when user clicks "Apply Grouping"
  @Output() applyGrouping = new EventEmitter<void>();

  // Array of group headers – for example, excluding "Name"
  groupKeys: string[] = [];
  selectedOption: string | null = null;
  listExpanded: boolean = false;
  // Hold the selected tokens (as a Set to avoid duplicates).
  selectedTokens: Set<string> = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.aggregatedOptions) {
      // Exclude the "Name" group if desired and force "All" to be the first group.
      this.groupKeys = Object.keys(this.aggregatedOptions)
        .filter(key => key !== 'Name')
        .sort((a, b) => {
          if (a === 'All') { return -1; }
          if (b === 'All') { return 1; }
          return a.localeCompare(b);
        });
    }
  }

  // When a token is toggled, add or remove from the selected tokens set.
  toggleToken(token: string): void {
    if (this.selectedTokens.has(token)) {
      this.selectedTokens.delete(token);
    } else {
      this.selectedTokens.add(token);
    }
    // Emit the updated tokens as an array.
    this.tokensChanged.emit(Array.from(this.selectedTokens));
  }

  // Check if a token is already selected.
  isTokenSelected(token: string): boolean {
    return this.selectedTokens.has(token);
  }

  // Build a comma-separated string for displaying in the input box.
  getSelectedTokensAsString(): string {
    return Array.from(this.selectedTokens).join(', ');
  }

  toggleList(): void {
    this.listExpanded = !this.listExpanded;
  }

  close(): void {
    this.closed.emit();
  }

  // NEW: Called when the "Apply Grouping" button is clicked.
  onApplyGrouping(): void {
    this.applyGrouping.emit();
  }

}
