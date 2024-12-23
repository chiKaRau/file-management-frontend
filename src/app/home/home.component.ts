// home.component.ts
import { Component, NgZone } from '@angular/core';
import { ElectronService } from '../core/services/electron/electron.service';
import * as fs from 'fs';
import * as path from 'path';

interface DirectoryItem {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  selectedDirectory: string | null = null;
  directoryContents: DirectoryItem[] = [];
  errorMessage: string | null = null;
  infoMessage: string | null = null; // Added infoMessage
  isLoading: boolean = false; // Added loading flag

  constructor(
    private electronService: ElectronService,
    private ngZone: NgZone // Inject NgZone
  ) { }

  async openDirectory() {
    const directoryPath = await this.electronService.openDirectoryDialog();
    if (directoryPath) {
      // Start loading
      this.ngZone.run(() => {
        this.isLoading = true;
        this.selectedDirectory = directoryPath;
        this.errorMessage = null; // Reset error message
        this.infoMessage = null; // Reset info message
      });
      this.loadDirectoryContents(directoryPath);
    } else {
      // Display a cancellation message
      this.ngZone.run(() => {
        this.infoMessage = 'Directory selection was canceled.';
      });
      console.warn('Directory selection canceled.');
    }
  }

  loadDirectoryContents(directoryPath: string) {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        // Update inside the zone
        this.ngZone.run(() => {
          console.error('Error reading directory:', err);
          this.errorMessage = 'Failed to read the directory contents.';
          this.isLoading = false; // Stop loading
        });
        return;
      }

      // UI updates inside NgZone
      this.ngZone.run(() => {
        if (files.length === 0) {
          this.errorMessage = 'The selected directory is empty.';
        } else {
          // Clear the error since we have files
          this.errorMessage = null;
        }

        this.directoryContents = files.map((file) => {
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
        this.isLoading = false; // Stop loading
      });
    });
  }

  openSubDirectory(subDirPath: string) {
    // Even though this isn't async, if it triggers file reads, wrap UI updates:
    this.ngZone.run(() => {
      this.selectedDirectory = subDirPath;
      this.isLoading = true; // Start loading
      this.errorMessage = null; // Reset error message
      this.infoMessage = null; // Reset info message
    });
    this.loadDirectoryContents(subDirPath);
  }
}
