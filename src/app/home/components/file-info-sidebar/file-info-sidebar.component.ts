import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DirectoryItem } from '../file-list/model/directory-item.model';

@Component({
  selector: 'app-file-info-sidebar',
  templateUrl: './file-info-sidebar.component.html',
  styleUrls: ['./file-info-sidebar.component.scss']
})
export class FileInfoSidebarComponent {
  @Input() item: DirectoryItem | null = null;
  // You can also add an optional input if you want to control width or other behavior
  // @Input() embedded = true;

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
