import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-grouping-sidebar',
  templateUrl: './grouping-sidebar.component.html',
  styleUrls: ['./grouping-sidebar.component.scss']
})
export class GroupingSidebarComponent {
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
