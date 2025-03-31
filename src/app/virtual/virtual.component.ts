import { Component, OnInit } from '@angular/core';
import { VirtualService } from './services/virtual.service';

@Component({
  selector: 'app-virtual',
  templateUrl: './virtual.component.html',
  styleUrls: ['./virtual.component.scss']
})
export class VirtualComponent implements OnInit {
  currentPath: string = '';
  files: any[] = [];
  directories: any[] = [];
  virtualItems: any[] = [];
  selectedFile: any = null;
  viewMode: string = 'extraLarge';

  constructor(private virtualService: VirtualService) { }

  ngOnInit(): void {
    this.currentPath = this.virtualService.getCurrentPath() || '\\ACG\\';
    this.loadContent(this.currentPath);
  }

  loadContent(path: string): void {
    // Clear previous data to avoid mixing different folder contents
    this.directories = [];
    this.files = [];
    this.virtualItems = [];

    this.virtualService.setCurrentPath(path);

    // Fetch directories
    this.virtualService.getDirectories(path).subscribe({
      next: (response: { payload: any[] }) => {
        this.directories = response.payload.map(dir => ({
          isDirectory: true,
          name: dir.directory,
          drive: dir.drive,
          path: `\\${dir.drive}\\${dir.directory}\\`
        }));
        this.combineItems();
      },
      error: (err) => console.error('Error fetching directories', err)
    });

    // Fetch files
    this.virtualService.getFiles(path).subscribe({
      next: (response: { payload: any[] }) => {
        this.files = response.payload.map(item => {
          const model = item.model;
          return {
            isFile: true,
            name: model.name,
            drive: item.drive,
            path: `\\${item.drive}\\${model.name}`,
            scanData: model,
            isDeleted: false,
            imageUrl: (model.imageUrls && model.imageUrls.length > 0) ? model.imageUrls[0].url : ''
          };
        });
        this.combineItems();
      },
      error: (err) => console.error('Error fetching files', err)
    });
  }


  combineItems(): void {
    this.virtualItems = [...this.directories, ...this.files];
  }

  onPathChange(newPath: string): void {
    this.currentPath = newPath;
    this.loadContent(newPath);
  }
}
