import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-virtual-model-modal',
  templateUrl: './virtual-model-modal.component.html',
  styleUrls: ['./virtual-model-modal.component.scss']
})
export class VirtualModelModalComponent {
  @Input() modelVersion: any;
  @Output() close = new EventEmitter<void>();

  onOverlayClick(event: MouseEvent): void {
    event.stopPropagation();
    this.onClose(event);
  }

  onClose(event: MouseEvent): void {
    event.stopPropagation();
    this.close.emit();
  }
}
