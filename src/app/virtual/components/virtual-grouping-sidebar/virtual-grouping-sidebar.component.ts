import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Type } from '@angular/core';

@Component({
  selector: 'app-virtual-grouping-sidebar',
  templateUrl: './virtual-grouping-sidebar.component.html',
  styleUrls: ['./virtual-grouping-sidebar.component.scss']
})
export class VirtualGroupingSidebarComponent implements OnChanges {
  // Aggregated options passed in from the parent.
  @Input() aggregatedOptions: { [key: string]: string[] } = {};
  // The selected models passed in from the parent.
  @Input() selectedFiles: any[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() tokensChanged = new EventEmitter<string[]>();
  // Event emitted when the user clicks the "Apply Grouping" button.
  @Output() groupingApplied = new EventEmitter<void>();
  @Output() groupingRemoved = new EventEmitter<any>();

  groupKeys: string[] = [];
  listExpanded: boolean = false;
  // Hold the selected tokens (as a Set to avoid duplicates).
  selectedTokens: Set<string> = new Set<string>();

  selectedTokensString: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.aggregatedOptions) {
      // Exclude "Name" if you wish; you may modify as desired.
      this.groupKeys = Object.keys(this.aggregatedOptions)
        .filter(key => key !== 'Name')
        .sort((a, b) => {
          if (a === 'All') { return -1; }
          if (b === 'All') { return 1; }
          return a.localeCompare(b);
        });
    }
  }

  // Toggle a token value in the selectedTokens set.
  toggleToken(token: string): void {
    if (this.selectedTokens.has(token)) {
      this.selectedTokens.delete(token);
    } else {
      this.selectedTokens.add(token);
    }
    // Update the input's string representation.
    this.updateTokensString();
    // Emit the updated tokens.
    this.tokensChanged.emit(Array.from(this.selectedTokens));
  }



  // Update the string representation from the selectedTokens set.
  updateTokensString(): void {
    this.selectedTokensString = Array.from(this.selectedTokens).join(', ');
  }


  // Called when the user changes the input.
  onTokensInputChange(value: string): void {
    const tokens = value.split(',')
      .map(token => token.trim())
      .filter(token => token.length > 0);
    this.selectedTokens = new Set(tokens);
    this.tokensChanged.emit(Array.from(this.selectedTokens));
    // Update the string property (this should already be the case
    // because the input uses two-way binding, but it's fine to ensure).
    this.updateTokensString();
  }


  // Clear the input and tokens.
  clearTokens(): void {
    this.selectedTokens.clear();
    this.selectedTokensString = '';
    this.tokensChanged.emit([]);
  }

  // Returns a comma-separated string for display in the input box.
  getSelectedTokensAsString(): string {
    return Array.from(this.selectedTokens).join(', ');
  }

  toggleList(): void {
    this.listExpanded = !this.listExpanded;
  }

  close(): void {
    this.closed.emit();
  }

  // Called when the "Apply Grouping" button is clicked.
  onApplyGrouping(): void {
    this.groupingApplied.emit();
    this.clearTokens(); // Clear the tokens and input box after grouping is applied.
  }

  removeGrouping(file: any, event: MouseEvent): void {
    event.stopPropagation(); // Prevent any parent click actions.
    this.groupingRemoved.emit(file);
  }

  // NEW: Aggregate properties of the selected models.
  get selectedModelsAggregated(): { [prop: string]: string[] } {
    const result: { [prop: string]: Set<string> } = {
      "Name": new Set<string>(),
      "scanData.name": new Set<string>(),
      "scanData.tags": new Set<string>(),
      "scanData.mainModelName": new Set<string>(),
      "scanData.triggerWords": new Set<string>()
    };

    if (this.selectedFiles) {
      for (const file of this.selectedFiles) {
        // File name (the top-level file property)
        if (file.name) {
          result["Name"].add(file.name);
        }
        if (file.scanData) {
          if (file.scanData.name) {
            result["scanData.name"].add(file.scanData.name);
          }
          if (Array.isArray(file.scanData.tags)) {
            file.scanData.tags.forEach((tag: string) => result["scanData.tags"].add(tag));
          }
          if (file.scanData.mainModelName) {
            result["scanData.mainModelName"].add(file.scanData.mainModelName);
          }
          if (Array.isArray(file.scanData.triggerWords)) {
            file.scanData.triggerWords.forEach((tw: string) => result["scanData.triggerWords"].add(tw));
          }
        }
      }
    }

    // Convert sets to sorted arrays.
    const final: { [prop: string]: string[] } = {};
    for (const key in result) {
      final[key] = Array.from(result[key]).sort();
    }
    return final;
  }

  // Getter for property headers in sorted order.
  get selectedModelsProperties(): string[] {
    return Object.keys(this.selectedModelsAggregated).sort();
  }
}
