import { Component } from '@angular/core';
import { ExplorerStateService } from '../home/services/explorer-state.service';
// Import Node modules (make sure Node integration is enabled in Electron)
import * as fs from 'fs';
import * as path from 'path';
import { RecycleService } from '../recycle/recycle.service';

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent {
  // Preference flags
  rememberLastDirectory = true;
  enableCivitaiMode = false;
  viewMode: 'extraLarge' | 'large' | 'medium' | 'small' | 'list' | 'details' = 'large';

  // Directory inputs start empty.
  storageDir: string = '';
  deleteDir: string = '';

  // Verification flags (used to disable the Verify buttons after success)
  storageVerified: boolean = false;
  deleteVerified: boolean = false;

  constructor(private explorerState: ExplorerStateService, private recycleService: RecycleService) {
    // Load existing preferences if available.
    this.enableCivitaiMode = explorerState.enableCivitaiMode;
    this.viewMode = explorerState.viewMode;
  }

  /**
   * Verifies the given directory path immediately.
   * - For the storage directory: creates the directory if needed and then creates "recycle-bin.json" inside it.
   * - For the delete directory: simply creates the directory if needed.
   * The path must include "@scan@".
   */
  verifyPath(type: 'storage' | 'delete'): void {
    let dirPath = (type === 'storage' ? this.storageDir : this.deleteDir).trim();

    try {
      // Create the base directory if it doesn't exist.
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created base directory: ${dirPath}`);
      } else {
        console.log(`Base directory already exists: ${dirPath}`);
      }

      // Determine subfolder name based on the type.
      const subFolderName = type === 'storage' ? 'data' : 'delete';
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
      } else {
        // For delete: nothing additional needs to be created.
        this.deleteVerified = true;
        alert('Delete directory verified.');
      }

      // Update the RecycleService if both directories have been verified.
      this.updateRecycleServicePaths();

    } catch (error: any) {
      alert('Error verifying directory: ' + error.message);
    }
  }

  private updateRecycleServicePaths(): void {
    if (this.storageVerified && this.deleteVerified) {
      // Call setPaths in RecycleService with the original input values.
      // The RecycleService can decide how to use these values (e.g. appending the correct subfolders).
      this.recycleService.setPaths(this.storageDir, this.deleteDir);
      console.log('RecycleService paths have been updated.');
    }
  }

  /**
   * Saves the other preferences (view mode, etc.).
   * Since directory creation is handled immediately via Verify,
   * this method does not interact with the recycle service.
   */
  savePreferences(): void {
    this.explorerState.enableCivitaiMode = this.enableCivitaiMode;
    this.explorerState.saveViewMode(this.viewMode);

    // (Optional) Save these values to localStorage or another settings service.
    console.log('Saved preferences:', {
      enableCivitaiMode: this.enableCivitaiMode,
      viewMode: this.viewMode,
      storageDir: this.storageDir,
      deleteDir: this.deleteDir,
    });
    alert('Preferences saved.');
  }
}
