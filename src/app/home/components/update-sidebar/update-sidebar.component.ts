import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DirectoryItem } from '../file-list/model/directory-item.model';

@Component({
  selector: 'app-update-sidebar',
  templateUrl: './update-sidebar.component.html',
  styleUrls: ['./update-sidebar.component.scss']
})
export class UpdateSidebarComponent {
  @Input() item: DirectoryItem | null = null;
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
