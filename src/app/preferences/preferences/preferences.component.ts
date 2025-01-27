import { Component } from '@angular/core';
import { ExplorerStateService } from '../../home/services/explorer-state.service';

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent {

  // Example preference flags
  rememberLastDirectory = true;
  enableCivitaiMode = false;

  viewMode: 'extraLarge' | 'large' | 'medium' | 'small' | 'list' | 'details' = 'large';

  constructor(private explorerState: ExplorerStateService) {
    // Potentially load existing preferences from electron-store or localStorage
    // Then set local component properties accordingly
    this.enableCivitaiMode = explorerState.enableCivitaiMode;
    this.viewMode = this.explorerState.viewMode;
  }

  savePreferences() {
    // Save to the service
    this.explorerState.enableCivitaiMode = this.enableCivitaiMode;
    this.explorerState.saveViewMode(this.viewMode);

    console.log('Saved preferences =>', {
      enableCivitaiMode: this.enableCivitaiMode,
      viewMode: this.viewMode,
    });
  }
}
