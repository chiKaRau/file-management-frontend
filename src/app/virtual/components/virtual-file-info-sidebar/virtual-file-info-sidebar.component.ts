import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-virtual-file-info-sidebar',
  templateUrl: './virtual-file-info-sidebar.component.html',
  styleUrls: ['./virtual-file-info-sidebar.component.scss']
})
export class VirtualFileInfoSidebarComponent {
  @Input() selectedFile: any;
}
