import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-virtual-grouping-sidebar',
  templateUrl: './virtual-grouping-sidebar.component.html',
  styleUrls: ['./virtual-grouping-sidebar.component.scss']
})
export class VirtualGroupingSidebarComponent implements OnChanges {
  // Expect an object where keys are group headers and values are arrays of option strings.
  @Input() aggregatedOptions: { [key: string]: string[] } = {};

  // Emit a closed event so the parent can hide the sidebar.
  @Output() closed = new EventEmitter<void>();

  // An array of group keys (excluding the "Name" group).
  groupKeys: string[] = [];

  // Store the currently selected option.
  selectedOption: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.aggregatedOptions) {
      // Remove the "Name" group header since it's redundant.
      this.groupKeys = Object.keys(this.aggregatedOptions).filter(key => key !== 'Name');
    }
  }

  // Called when an option button is clicked.
  onOptionClick(option: string): void {
    console.log("Option clicked:", option);
    this.selectedOption = option;
  }

  // Called when the close button is clicked.
  close(): void {
    this.closed.emit();
  }
}
