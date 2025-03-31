import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-virtual-explorer-toolbar',
  templateUrl: './virtual-explorer-toolbar.component.html',
  styleUrls: ['./virtual-explorer-toolbar.component.scss']
})
export class VirtualExplorerToolbarComponent {
  @Input() currentPath: string = '\\ACG\\';
  @Output() pathChanged: EventEmitter<string> = new EventEmitter<string>();

  // Holds the input value (in case you want to use two-way binding)
  inputPath: string = this.currentPath;

  // When user presses the "Go" button or hits Enter in the input
  triggerPathChange(): void {
    // Emit the path entered by the user
    this.currentPath = this.inputPath;
    this.pathChanged.emit(this.inputPath);
  }

  // Called when the user wants to navigate back
  goBack(): void {
    // Remove trailing backslash if present
    const trimmedPath = this.currentPath.endsWith('\\')
      ? this.currentPath.slice(0, -1)
      : this.currentPath;
    // Find the last backslash index to get the parent path
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
