// src/app/virtual/virtual.component.ts
import { Component, HostListener, OnInit } from '@angular/core';
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
  selectedModelVersion: any = null; // Add this property to hold the model data for the modal

  // Navigation history
  history: string[] = [];
  historyIndex: number = -1;
  canGoBack: boolean = false;
  canGoForward: boolean = false;

  // Drive filtering
  availableDrives: string[] = [];
  selectedDrive: string = 'all'; // "all" means show all drives

  constructor(private virtualService: VirtualService) { }

  ngOnInit(): void {
    // Start with default path (or from service)
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

        // Map directories with a displayName that appends drive if "all" drives are selected
        this.fullDirectories = Array.isArray(dirPayload)
          ? dirPayload.map((dir: any) => {
            const displayName = this.selectedDrive === 'all'
              ? `${dir.directory} (${dir.drive})`
              : dir.directory;
            return {
              isDirectory: true,
              name: dir.directory,
              displayName,
              drive: dir.drive,
              path: basePath + (basePath.endsWith('\\') ? '' : '\\') + dir.directory + '\\'
            };
          })
          : [];

        // Map files
        this.fullFiles = Array.isArray(filePayload)
          ? filePayload.map((item: any) => {
            const model = item.model;
            return {
              isFile: true,
              name: model.name,
              drive: item.drive,
              path: basePath + (basePath.endsWith('\\') ? '' : '\\') + model.name,
              scanData: model,
              isDeleted: false,
              imageUrl: (model.imageUrls && model.imageUrls.length > 0) ? model.imageUrls[0].url : ''
            };
          })
          : [];

        // Update available drives (unique values)
        const drivesSet = new Set<string>();
        this.fullDirectories.forEach(dir => drivesSet.add(dir.drive));
        this.fullFiles.forEach(file => drivesSet.add(file.drive));
        this.availableDrives = Array.from(drivesSet);
        console.log('Available Drives:', this.availableDrives);

        // Combine items and filter by drive
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // If the click is not inside the sidebar, close the file info sidebar.
    if (!target.closest('.sidebar')) {
      this.selectedFile = null;
    }
  }

  combineItems(): void {
    let allItems = [...this.fullDirectories, ...this.fullFiles];
    // Filter items if a specific drive is selected (case-insensitively)
    if (this.selectedDrive !== 'all') {
      allItems = allItems.filter(item =>
        item.drive && item.drive.toUpperCase() === this.selectedDrive.toUpperCase()
      );
    }
    this.virtualItems = allItems;
    console.log('Filtered virtualItems:', this.virtualItems);
  }

  onPathChange(newPath: string): void {
    if (!newPath.endsWith('\\')) {
      newPath += '\\';
    }
    if (newPath !== this.currentPath) {
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
      this.virtualItems = [...this.fullDirectories, ...this.fullFiles].filter(item => {
        if (item.isFile && item.scanData) {
          const modelID = item.scanData.modelNumber || '';
          const versionID = item.scanData.versionNumber || '';
          const baseModel = item.scanData.baseModel || '';
          const name = item.name || '';
          const combined = `${modelID}_${versionID}_${baseModel}_${name}`.toLowerCase();
          return combined.includes(lower);
        } else {
          return item.name.toLowerCase().includes(lower);
        }
      });
    }
  }

  onDriveChange(drive: string): void {
    console.log('Drive changed to:', drive);
    this.selectedDrive = drive;
    this.combineItems();
  }

  onFileModalOpen(modelVersion: any): void {
    this.selectedModelVersion = modelVersion;
  }

}
