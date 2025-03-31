// virtual.component.ts
import { Component, OnInit } from '@angular/core';
import { VirtualService } from './services/virtual.service';

@Component({
  selector: 'app-virtual',
  templateUrl: './virtual.component.html',
  styleUrls: ['./virtual.component.scss']
})
export class VirtualComponent implements OnInit {
  currentPath: string = '\\ACG\\';
  files: any[] = [];
  directories: any[] = [];
  selectedFile: any; // For file-info-sidebar

  constructor(private virtualService: VirtualService) { }

  ngOnInit(): void {
    // If no path stored, initialize with default; else, use the stored value
    this.currentPath = this.virtualService.getCurrentPath() || '\\ACG\\';
    this.loadContent(this.currentPath);
  }

  // Load directories and files for the given path
  loadContent(path: string): void {
    this.virtualService.setCurrentPath(path);

    this.virtualService.getDirectories(path).subscribe(data => {
      this.directories = data;
    });

    this.virtualService.getFiles(path).subscribe(data => {
      this.files = data;
    });
  }

  // Called by explorer-toolbar when a new path is entered or navigated to
  onPathChange(newPath: string): void {
    this.currentPath = newPath;
    this.loadContent(newPath);
  }
}
