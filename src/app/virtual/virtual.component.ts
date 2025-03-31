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
  fullDirectories: any[] = [];
  fullFiles: any[] = [];
  virtualItems: any[] = [];
  selectedFile: any = null;
  viewMode: string = 'extraLarge';
  loading: boolean = false;

  // History tracking properties
  history: string[] = [];
  historyIndex: number = -1;

  // Navigation flags
  canGoBack: boolean = false;
  canGoForward: boolean = false;

  constructor(private virtualService: VirtualService) { }

  ngOnInit(): void {
    // Start with a default path if none set
    this.currentPath = this.virtualService.getCurrentPath() || '\\ACG\\';
    this.addToHistory(this.currentPath);
    this.loadContent(this.currentPath);
  }

  loadContent(path: string): void {
    // Clear previous data
    this.fullDirectories = [];
    this.fullFiles = [];
    this.virtualItems = [];
    this.loading = true;

    this.virtualService.setCurrentPath(path);
    const basePath = path;

    forkJoin({
      dirs: this.virtualService.getDirectories(path),
      files: this.virtualService.getFiles(path)
    }).subscribe({
      next: ({ dirs, files }) => {
        const dirPayload = (dirs && dirs.payload) ? dirs.payload : dirs;
        const filePayload = (files && files.payload) ? files.payload : files;

        this.fullDirectories = Array.isArray(dirPayload)
          ? dirPayload.map((dir: any) => ({
            isDirectory: true,
            name: dir.directory,
            path: basePath + (basePath.endsWith('\\') ? '' : '\\') + dir.directory + '\\'
          }))
          : [];

        this.fullFiles = Array.isArray(filePayload)
          ? filePayload.map((item: any) => {
            const model = item.model;
            return {
              isFile: true,
              name: model.name,
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
        this.updateNavigationFlags();
      },
      error: (err) => {
        console.error('Error fetching virtual content:', err);
        this.loading = false;
      }
    });
  }

  combineItems(): void {
    this.virtualItems = [...this.fullDirectories, ...this.fullFiles];
  }

  onPathChange(newPath: string): void {
    // Ensure newPath ends with a backslash
    if (!newPath.endsWith('\\')) {
      newPath += '\\';
    }
    if (newPath !== this.currentPath) {
      // When a new path is chosen, discard any "forward" history
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.addToHistory(newPath);
      this.currentPath = newPath;
      this.loadContent(newPath);
    }
  }

  addToHistory(path: string): void {
    this.history.push(path);
    this.historyIndex = this.history.length - 1;
  }

  updateNavigationFlags(): void {
    this.canGoBack = this.historyIndex > 0;
    this.canGoForward = this.historyIndex < this.history.length - 1;
  }

  onBack(): void {
    if (this.canGoBack) {
      this.historyIndex--;
      const newPath = this.history[this.historyIndex];
      this.currentPath = newPath;
      this.loadContent(newPath);
      this.updateNavigationFlags();
    }
  }

  onForward(): void {
    if (this.canGoForward) {
      this.historyIndex++;
      const newPath = this.history[this.historyIndex];
      this.currentPath = newPath;
      this.loadContent(newPath);
      this.updateNavigationFlags();
    }
  }

  onRefresh(): void {
    this.loadContent(this.currentPath);
  }

  onSearch(query: string): void {
    if (!query) {
      this.combineItems();
    } else {
      const lower = query.toLowerCase();
      this.virtualItems = [...this.fullDirectories, ...this.fullFiles].filter(item =>
        item.name.toLowerCase().includes(lower)
      );
    }
  }
}
