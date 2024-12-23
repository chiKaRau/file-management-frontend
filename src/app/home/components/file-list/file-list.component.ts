import { Component, Input, Output, EventEmitter } from '@angular/core';

interface DirectoryItem {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
}

@Component({
  selector: 'app-file-list',
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.scss']
})
export class FileListComponent {
  @Input() items: DirectoryItem[] = [];
  @Output() openFolder = new EventEmitter<string>();

  onItemClick(item: DirectoryItem) {
    if (item.isDirectory) {
      this.openFolder.emit(item.path);
    } else {
      console.log('File clicked:', item.path);
    }
  }
}
