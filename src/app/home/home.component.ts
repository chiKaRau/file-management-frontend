// home.component.ts

import { Component, NgZone } from '@angular/core';
import { ElectronService } from '../core/services/electron/electron.service';
import { NavigationService } from './services/navigation.service';
import { ExplorerStateService, DirectoryItem } from './services/explorer-state.service';
import * as fs from 'fs';
import * as path from 'path';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  // Remove local properties, read from the ExplorerStateService instead

  constructor(
    private electronService: ElectronService,
    private ngZone: NgZone,
    public navigationService: NavigationService,
    public explorerState: ExplorerStateService // Inject the service
  ) { }

  // For convenience, define getters/setters that read/write service fields
  get selectedDirectory(): string | null {
    return this.explorerState.selectedDirectory;
  }
  set selectedDirectory(val: string | null) {
    this.explorerState.selectedDirectory = val;
  }

  get directoryContents(): DirectoryItem[] {
    return this.explorerState.directoryContents;
  }
  set directoryContents(val: DirectoryItem[]) {
    this.explorerState.directoryContents = val;
  }

  get errorMessage(): string | null {
    return this.explorerState.errorMessage;
  }
  set errorMessage(val: string | null) {
    this.explorerState.errorMessage = val;
  }

  get infoMessage(): string | null {
    return this.explorerState.infoMessage;
  }
  set infoMessage(val: string | null) {
    this.explorerState.infoMessage = val;
  }

  get isLoading(): boolean {
    return this.explorerState.isLoading;
  }
  set isLoading(val: boolean) {
    this.explorerState.isLoading = val;
  }

  async openDirectory() {
    const directoryPath = await this.electronService.openDirectoryDialog();
    if (directoryPath) {
      this.ngZone.run(() => {
        this.isLoading = true;
        this.errorMessage = null;
        this.infoMessage = null;
      });

      this.navigationService.navigateTo(directoryPath);
      this.loadDirectoryContents(directoryPath);
    } else {
      this.ngZone.run(() => {
        this.infoMessage = 'Directory selection was canceled.';
      });
    }
  }

  loadDirectoryContents(directoryPath: string) {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        this.ngZone.run(() => {
          console.error('Error reading directory:', err);
          this.errorMessage = 'Failed to read the directory contents.';
          this.isLoading = false;
        });
        return;
      }

      this.ngZone.run(() => {
        if (files.length === 0) {
          this.errorMessage = 'The selected directory is empty.';
        } else {
          this.errorMessage = null;
        }

        this.selectedDirectory = directoryPath; // Now sets it in the service
        this.directoryContents = files.map(file => {
          const fullPath = path.join(directoryPath, file);
          const stats = fs.statSync(fullPath);
          return {
            name: file,
            path: fullPath,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory()
          };
        });

        console.log('Directory Contents:', this.directoryContents);
        this.isLoading = false;
      });
    });
  }

  onBack() {
    const prevPath = this.navigationService.goBack();
    if (prevPath) {
      this.ngZone.run(() => {
        this.selectedDirectory = prevPath;
        this.isLoading = true;
      });
      this.loadDirectoryContents(prevPath);
    }
  }

  onForward() {
    const nextPath = this.navigationService.goForward();
    if (nextPath) {
      this.ngZone.run(() => {
        this.selectedDirectory = nextPath;
        this.isLoading = true;
      });
      this.loadDirectoryContents(nextPath);
    }
  }

  onRefresh() {
    if (this.selectedDirectory) {
      this.ngZone.run(() => {
        this.isLoading = true;
      });
      this.loadDirectoryContents(this.selectedDirectory);
    }
  }

  openSubDirectory(subDirPath: string) {
    this.ngZone.run(() => {
      this.isLoading = true;
      this.errorMessage = null;
      this.infoMessage = null;
    });
    this.navigationService.navigateTo(subDirPath);
    this.loadDirectoryContents(subDirPath);
  }
}
