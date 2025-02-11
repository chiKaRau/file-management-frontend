import { Component } from '@angular/core';

@Component({
  selector: 'app-update',
  templateUrl: './update.component.html',
  styleUrls: ['./update.component.scss']
})
export class UpdateComponent {
  filePath: string = '';

  verifyFilePath(): void {
    // Check if the entered filePath includes "update"
    if (this.filePath.includes('update')) {
      console.log('Valid file path:', this.filePath);
      alert('File path is valid. Proceeding with update process...');
      // Here you could add further logic for the update process
    } else {
      alert('Invalid file path. The file path must contain "update".');
    }
  }
}
