// navigation.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavigationService {
    private history: string[] = [];
    private currentIndex = -1;

    get currentDirectory(): string | null {
        if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
            return this.history[this.currentIndex];
        }
        return null;
    }

    /**
     * Navigate to a new directory, pushing it onto the history stack.
     */
    navigateTo(path: string): void {
        // If we're somewhere in the history and move forward, we remove future entries
        if (this.currentIndex < this.history.length - 1) {
            this.history.splice(this.currentIndex + 1);
        }
        this.history.push(path);
        this.currentIndex = this.history.length - 1;
    }

    canGoBack(): boolean {
        return this.currentIndex > 0;
    }

    canGoForward(): boolean {
        return this.currentIndex < this.history.length - 1;
    }

    goBack(): string | null {
        if (this.canGoBack()) {
            this.currentIndex--;
            return this.currentDirectory;
        }
        return null;
    }

    goForward(): string | null {
        if (this.canGoForward()) {
            this.currentIndex++;
            return this.currentDirectory;
        }
        return null;
    }
}
