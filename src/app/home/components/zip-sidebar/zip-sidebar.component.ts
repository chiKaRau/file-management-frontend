import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-zip-sidebar',
  templateUrl: './zip-sidebar.component.html',
  styleUrls: ['./zip-sidebar.component.scss']
})
export class ZipSidebarComponent {
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
