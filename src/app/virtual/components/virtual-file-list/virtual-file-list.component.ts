import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

@Component({
  selector: 'app-virtual-file-list',
  templateUrl: './virtual-file-list.component.html',
  styleUrls: ['./virtual-file-list.component.scss']
})
export class VirtualFileListComponent {
  @Input() items: any[] = [];

  constructor(private sanitizer: DomSanitizer) { }

  isImage(item: any): boolean {
    // Check based on imageUrl if provided, or fall back to the item name
    const url = item.imageUrl || item.name;
    return /\.(png|jpe?g|gif|webp)$/i.test(url);
  }

  getBackgroundImage(url: string): SafeStyle {
    // If the URL already starts with http, use it directly.
    let normalized = url.replace(/\\/g, '/');
    if (!normalized.startsWith('file:///') && !normalized.startsWith('http')) {
      normalized = 'file:///' + normalized;
    }
    return this.sanitizer.bypassSecurityTrustStyle(`url("${normalized}")`);
  }
}
