import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-model-modal',
  templateUrl: './model-modal.component.html',
  styleUrls: ['./model-modal.component.scss']
})
export class ModelModalComponent {
  @Input() modelVersion: any;
  @Output() close = new EventEmitter<void>();

  onOverlayClick(event: MouseEvent) {
    // Stop propagation so that this click doesn't bubble to any global handlers.
    event.stopPropagation();
    this.onClose(event);
  }

  onClose(event: MouseEvent) {
    event.stopPropagation();
    this.close.emit();
  }
}
