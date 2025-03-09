import { Component } from '@angular/core';

@Component({
  selector: 'app-virtual',
  templateUrl: './virtual.component.html',
  styleUrls: ['./virtual.component.scss']
})
export class VirtualComponent {
  filePath: string = '';

  verifyFilePath(): void {
    // Check if the entered filePath includes "virtual"
    if (this.filePath.includes('virtual')) {
      console.log('Valid file path:', this.filePath);
      alert('File path is valid. Proceeding with virtual process...');
      // Here you could add further logic for the virtual process
    } else {
      alert('Invalid file path. The file path must contain "virtual".');
    }
  }
}
