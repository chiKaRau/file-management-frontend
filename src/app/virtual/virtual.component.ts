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
    // Start with a default path
    this.currentPath = this.virtualService.getCurrentPath() || '\\ACG\\';
    this.loadContent(this.currentPath);
  }

  loadContent(path: string): void {
    // Clear previous items and set loading flag
    this.directories = [];
    this.files = [];
    this.virtualItems = [];
    this.loading = true;

    this.virtualService.setCurrentPath(path);
    const basePath = path; // current path to use for relative mapping

    forkJoin({
      dirs: this.virtualService.getDirectories(path),
      files: this.virtualService.getFiles(path)
    }).subscribe({
      next: ({ dirs, files }) => {
        // Normalize responses: if there's a payload, use it; otherwise assume the response is the payload.
        const dirPayload = (dirs && dirs.payload) ? dirs.payload : dirs;
        const filePayload = (files && files.payload) ? files.payload : files;

        // For directories, build the path relative to the current path.
        this.directories = Array.isArray(dirPayload)
          ? dirPayload.map((dir: any) => ({
            isDirectory: true,
            name: dir.directory,
            // New path is currentPath + directory name + trailing backslash
            path: basePath + (basePath.endsWith('\\') ? '' : '\\') + dir.directory + '\\'
          }))
          : [];

        // For files, you can build a similar relative path.
        this.files = Array.isArray(filePayload)
          ? filePayload.map((item: any) => {
            const model = item.model;
            return {
              isFile: true,
              name: model.name, // or use model.mainModelName if preferred
              // Build file path relative to the current path.
              path: basePath + (basePath.endsWith('\\') ? '' : '\\') + model.name,
              scanData: model,
              isDeleted: false,
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
    // Ensure newPath ends with a backslash
    if (!newPath.endsWith('\\')) {
      newPath += '\\';
    }
    this.currentPath = newPath;
    this.loadContent(newPath);
  }
}
