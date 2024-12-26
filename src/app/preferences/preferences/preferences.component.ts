import { Component } from '@angular/core';

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent {
  // Example preference flags
  rememberLastDirectory = true;
  enableCivitaiMode = false;

  constructor() {
    // Potentially load existing preferences from electron-store or localStorage
  }

  savePreferences() {
    // Use electron-store or any service to save these preferences
    console.log('Saved preferences', {
      rememberLastDirectory: this.rememberLastDirectory,
      enableCivitaiMode: this.enableCivitaiMode
    });
  }
}
