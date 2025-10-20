import { Component, NgZone } from '@angular/core';
import { ExplorerStateService } from '../home/services/explorer-state.service';
// Import Node modules (make sure Node integration is enabled in Electron)
import * as fs from 'fs';
import * as path from 'path';
import { RecycleService } from '../recycle/recycle.service';

// Import Electron's dialog API (adjust based on your Electron version)
import { dialog } from 'electron';
import { ElectronService } from '../core/services/electron/electron.service';
import { PreferencesService } from './preferences.service';
import { SearchService } from '../home/services/search.service';
import { Theme, ThemeService } from '../home/services/theme.service';

type ViewMode = 'extraLarge' | 'large' | 'medium' | 'small' | 'list' | 'details';

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent {
  // Preference flags
  rememberLastDirectory = true;
  enableCivitaiMode = false;
  filesViewMode: ViewMode = 'large';
  foldersViewMode: ViewMode = 'large';
  theme: Theme = 'dark';
  searchLevels: number = 999; // NEW

  // Directory inputs start empty.
  storageDir: string = '';
  deleteDir: string = '';
  updateDir: string = ''; // New update directory
  scanDir: string = '';
  // Verification flags (used to disable the Verify buttons after success)
  storageVerified: boolean = false;
  deleteVerified: boolean = false;
  updateVerified: boolean = false; // Separate flag for update directory
  scanVerified: boolean = false;

  constructor(
    private explorerState: ExplorerStateService,
    private recycleService: RecycleService,
    private electronService: ElectronService,
    private ngZone: NgZone,
    private preferencesService: PreferencesService,
    private searchService: SearchService,
    private themeService: ThemeService,
  ) {
    // Load existing preferences if available.
    this.enableCivitaiMode = explorerState.enableCivitaiMode;
    this.filesViewMode = this.explorerState.filesViewMode ?? this.explorerState.viewMode ?? 'large';
    this.foldersViewMode = this.explorerState.foldersViewMode ?? this.explorerState.viewMode ?? 'large';
  }

  ngOnInit(): void {
    // load saved
    this.theme = (this.preferencesService.theme as Theme) || this.themeService.theme;
    // apply current on enter (in case route loaded before root applied)
    this.themeService.setTheme(this.theme);

    // Load values from service when the component initializes
    this.storageDir = this.preferencesService.storageDir;
    this.deleteDir = this.preferencesService.deleteDir;
    this.updateDir = this.preferencesService.updateDir;
    this.scanDir = this.preferencesService.scanDir;

    this.scanVerified = this.preferencesService.scanVerified;
    this.storageVerified = this.preferencesService.storageVerified;
    this.deleteVerified = this.preferencesService.deleteVerified;
    this.updateVerified = this.preferencesService.updateVerified;

    this.searchLevels = this.preferencesService.searchLevels || 999; // NEW
  }

  /**
   * Verifies the given directory path immediately.
   * - For the storage directory: creates the directory if needed and then creates "recycle-bin.json" inside its "data" subfolder.
   * - For the delete directory: simply creates a "delete" subfolder if needed.
   * - For the update directory: creates an "update" subfolder if needed.
   * (Note that the update directory does not interact with the RecycleService.)
   */
  verifyPath(type: 'storage' | 'delete' | 'update' | 'scan'): void {
    // Determine the directory based on the type
    let dirPath = (
      type === 'storage'
        ? this.storageDir
        : type === 'delete'
          ? this.deleteDir
          : type === 'update'
            ? this.updateDir
            : this.scanDir
    ).trim();

    try {
      // Create the base directory if it doesn't exist.
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created base directory: ${dirPath}`);
      } else {
        console.log(`Base directory already exists: ${dirPath}`);
      }

      if (type === 'scan') {
        // For the scan directory, we can simply verify the base directory.
        this.scanVerified = true;
        this.searchService.updateScanDir(this.scanDir);

        alert('Scan directory verified.');
      } else {
        // For the other types, determine the subfolder name.
        const subFolderName =
          type === 'storage' ? 'data' : type === 'delete' ? 'delete' : 'update';
        const actualPath = path.join(dirPath, subFolderName);

        // Create the subfolder if it doesn't exist.
        if (!fs.existsSync(actualPath)) {
          fs.mkdirSync(actualPath, { recursive: true });
          console.log(`Created ${subFolderName} directory: ${actualPath}`);
        } else {
          console.log(`${subFolderName} directory already exists: ${actualPath}`);
        }

        if (type === 'storage') {
          // For storage: create recycle-bin.json inside the "data" folder.
          const jsonPath = path.join(actualPath, 'recycle-bin.json');
          if (!fs.existsSync(jsonPath)) {
            fs.writeFileSync(jsonPath, JSON.stringify([], null, 2));
            console.log(`Created recycle bin file at: ${jsonPath}`);
          } else {
            console.log(`Recycle bin file already exists at: ${jsonPath}`);
          }
          this.storageVerified = true;
          alert('Storage directory verified and recycle-bin.json created.');
          this.recycleService.loadRecords();
        } else if (type === 'delete') {
          this.deleteVerified = true;
          alert('Delete directory verified.');
        } else if (type === 'update') {
          this.updateVerified = true;
          alert('Update directory verified.');
        }
      }

      // Store values in the PreferencesService so they persist while navigating.
      this.updatePreferencesService();

      // Update recycle service only when storage and delete are verified.
      this.updateRecycleServicePaths();
    } catch (error: any) {
      alert('Error verifying directory: ' + error.message);
    }
  }

  /**
   * Updates the recycle service with storage and delete paths if both have been verified.
   */
  private updateRecycleServicePaths(): void {
    if (this.storageVerified && this.deleteVerified) {
      // Only update recycle service with storage and delete directories.
      this.recycleService.setPaths(this.storageDir, this.deleteDir);
      console.log('RecycleService paths have been updated.');
    }
  }

  /**
   * Opens a configuration file so that the user can load saved directory paths.
   * The config file should be named something like "file-explorer-config.txt" or ".ini"
   * and contain lines such as:
   *
   *   storageDir=F:\...\@scan@
   *   deleteDir=F:\...\@scan@
   *   updateDir=F:\...\@scan@
   */
  async openConfigFile(): Promise<void> {
    try {
      // Call the openFileDialog method from your Electron service.
      const filePaths = await this.electronService.openFileDialog();
      if (filePaths && filePaths.length > 0) {
        const filePath = filePaths[0];

        // Validate the file extension
        if (!(filePath.endsWith('.txt') || filePath.endsWith('.ini'))) {
          alert('Please select a configuration file with a .txt or .ini extension.');
          return;
        }

        // Optional: ensure the file name contains "config" (case-insensitive)
        if (!/config/i.test(path.basename(filePath))) {
          alert('Please select a configuration file with "config" in its name (e.g., file-explorer-config.txt).');
          return;
        }

        // Read the file using Node's fs module.
        const content = fs.readFileSync(filePath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, value] = trimmed.split('=');
            const keyTrimmed = key.trim();
            const valueTrimmed = value.trim();
            if (keyTrimmed === 'storageDir') {
              this.storageDir = valueTrimmed;
            } else if (keyTrimmed === 'deleteDir') {
              this.deleteDir = valueTrimmed;
            } else if (keyTrimmed === 'updateDir') {
              this.updateDir = valueTrimmed;
            } else if (keyTrimmed === 'scanDir') {
              this.scanDir = valueTrimmed;
            }
          }
        });

        console.log('Configuration loaded from file.');
      } else {
        this.ngZone.run(() => {
          alert('File selection was canceled.');
        });
      }
    } catch (error: any) {
      alert('Error opening configuration file: ' + error.message);
    }
  }

  private updatePreferencesService(): void {
    this.preferencesService.storageDir = this.storageDir;
    this.preferencesService.deleteDir = this.deleteDir;
    this.preferencesService.updateDir = this.updateDir;
    this.preferencesService.scanDir = this.scanDir;

    this.preferencesService.storageVerified = this.storageVerified;
    this.preferencesService.deleteVerified = this.deleteVerified;
    this.preferencesService.updateVerified = this.updateVerified;
    this.preferencesService.scanVerified = this.scanVerified;
    this.preferencesService.searchLevels = this.searchLevels; // NEW

  }

  onThemeToggle() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.themeService.setTheme(this.theme);
    this.preferencesService.theme = this.theme; // remember alongside your other prefs
  }

  /**
   * Saves the other preferences (view mode, etc.).
   * Since directory creation is handled immediately via Verify,
   * this method does not interact with the recycle service.
   */
  savePreferences(): void {
    this.preferencesService.theme = this.theme;
    this.explorerState.enableCivitaiMode = this.enableCivitaiMode;
    this.explorerState.saveFilesViewMode(this.filesViewMode);
    this.explorerState.saveFoldersViewMode(this.foldersViewMode);
    this.preferencesService.searchLevels = this.searchLevels;

    // (Optional) Save these values to localStorage or another settings service.
    console.log('Saved preferences:', {
      enableCivitaiMode: this.enableCivitaiMode,
      filesViewMode: this.filesViewMode,
      foldersViewMode: this.foldersViewMode,
      storageDir: this.storageDir,
      deleteDir: this.deleteDir,
      updateDir: this.updateDir,
      searchLevels: this.searchLevels // NEW
    });
    alert('Preferences saved.');
  }
}
