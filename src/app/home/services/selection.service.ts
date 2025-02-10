// selection.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DirectoryItem } from '../components/file-list/model/directory-item.model';

@Injectable({ providedIn: 'root' })
export class SelectionService {
    // Holds the currently selected file/folder.
    private selectedItemSubject = new BehaviorSubject<DirectoryItem | null>(null);
    selectedItem$ = this.selectedItemSubject.asObservable();

    // Holds the sidebar position ('left' or 'right').
    private sidebarPositionSubject = new BehaviorSubject<'left' | 'right'>('right');
    sidebarPosition$ = this.sidebarPositionSubject.asObservable();

    /** Call this when an item is selected, passing the mouse event so we can decide the position. */
    setSelection(item: DirectoryItem, event: MouseEvent) {
        this.selectedItemSubject.next(item);
        const clickX = event.clientX;
        const windowCenter = window.innerWidth / 2;
        // If the click is on the left half of the window, show sidebar on the right.
        // Otherwise, show sidebar on the left.
        const position: 'left' | 'right' = clickX < windowCenter ? 'right' : 'left';
        console.log("position: " + position);
        this.sidebarPositionSubject.next(position);
    }

    clearSelection() {
        this.selectedItemSubject.next(null);
    }
}
