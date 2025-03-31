// virtual-file-list.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-virtual-file-list',
  templateUrl: './virtual-file-list.component.html',
  styleUrls: ['./virtual-file-list.component.scss']
})
export class VirtualFileListComponent {
  @Input() files: any[] = [];
  @Output() fileSelected: EventEmitter<any> = new EventEmitter<any>();

  onSelectFile(file: any): void {
    this.fileSelected.emit(file);
  }
}
