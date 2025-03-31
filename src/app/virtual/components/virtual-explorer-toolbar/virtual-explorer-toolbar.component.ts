import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-virtual-explorer-toolbar',
  templateUrl: './virtual-explorer-toolbar.component.html',
  styleUrls: ['./virtual-explorer-toolbar.component.scss']
})
export class VirtualExplorerToolbarComponent implements OnChanges {
  @Input() currentPath: string = '\\ACG\\';
  @Output() pathChanged: EventEmitter<string> = new EventEmitter<string>();

  // Internal variable to hold the current path for display/editing
  inputPath: string = this.currentPath;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentPath) {
      // Update the inputPath whenever the currentPath input changes from the parent
      this.inputPath = changes.currentPath.currentValue;
    }
  }

  // Called when user presses "Go" or hits Enter
  triggerPathChange(): void {
    this.currentPath = this.inputPath;
    this.pathChanged.emit(this.inputPath);
  }

  // Called when the user wants to navigate back
  goBack(): void {
    // Remove trailing backslash if present
    const trimmedPath = this.currentPath.endsWith('\\')
      ? this.currentPath.slice(0, -1)
      : this.currentPath;
    // Find the last backslash index to get the parent directory
    const lastIndex = trimmedPath.lastIndexOf('\\');
    if (lastIndex > 0) {
      const newPath = trimmedPath.substring(0, lastIndex + 1);
      this.currentPath = newPath;
      this.inputPath = newPath;
      this.pathChanged.emit(newPath);
    }
  }

  // Optionally update the inputPath on each keystroke (if not using ngModel)
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inputPath = target.value;
  }
}
