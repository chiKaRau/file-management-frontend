import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
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
  loading: boolean = false;

  constructor(private virtualService: VirtualService) { }

  ngOnInit(): void {
    // Use stored path or default to "\ACG\"
    this.currentPath = this.virtualService.getCurrentPath() || '\\ACG\\';
    this.loadContent(this.currentPath);
  }

  loadContent(path: string): void {
    // Clear previous data
    this.directories = [];
    this.files = [];
    this.virtualItems = [];
    this.loading = true;

    this.virtualService.setCurrentPath(path);

    // Use forkJoin to wait for both API calls
    forkJoin({
      dirs: this.virtualService.getDirectories(path),
      files: this.virtualService.getFiles(path)
    }).subscribe({
      next: ({ dirs, files }) => {
        // Normalize responses: if there's a 'payload' property use it, otherwise assume the response itself is the payload
        const dirPayload = dirs && dirs.payload ? dirs.payload : dirs;
        const filePayload = files && files.payload ? files.payload : files;

        this.directories = Array.isArray(dirPayload)
          ? dirPayload.map((dir: any) => ({
            isDirectory: true,
            name: dir.directory,
            drive: dir.drive,
            path: `\\${dir.drive}\\${dir.directory}\\`
          }))
          : [];

        this.files = Array.isArray(filePayload)
          ? filePayload.map((item: any) => {
            const model = item.model;
            return {
              isFile: true,
              name: model.name, // or model.mainModelName if preferred
              drive: item.drive,
              path: `\\${item.drive}\\${model.name}`,
              scanData: model,
              isDeleted: false,
              // Use first image URL from imageUrls if available
              imageUrl: (model.imageUrls && model.imageUrls.length > 0)
                ? model.imageUrls[0].url
                : ''
            };
          })
          : [];

        this.combineItems();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching virtual content:', err);
        this.loading = false;
      }
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
