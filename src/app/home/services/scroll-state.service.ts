// scroll-state.service.ts
import { Injectable } from '@angular/core';

/**
 * A simple service to store scroll positions for various routes.
 * Here we only store one variable for Home,
 * but you could expand it to store offsets for multiple routes if needed.
 */
@Injectable({ providedIn: 'root' })
export class ScrollStateService {
    homeScrollPosition: number = 0;
    // e.g., if you want to store other routes:
    // preferencesScrollPosition: number = 0; 
}
