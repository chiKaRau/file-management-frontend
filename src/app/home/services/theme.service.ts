import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly STORAGE_KEY = 'app-theme';
    private readonly _theme$ = new BehaviorSubject<Theme>(this.loadInitialTheme());
    readonly theme$ = this._theme$.asObservable();

    get theme(): Theme { return this._theme$.value; }

    setTheme(next: Theme) {
        if (next === this._theme$.value) return;
        this._theme$.next(next);
        localStorage.setItem(this.STORAGE_KEY, next);
        // Flip a class on <html> so all styles can react via CSS variables.
        const root = document.documentElement;
        root.classList.toggle('theme-dark', next === 'dark');
        root.classList.toggle('theme-light', next === 'light');
    }

    toggle() {
        this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    }

    private loadInitialTheme(): Theme {
        const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
        if (stored === 'dark' || stored === 'light') {
            // apply immediately on bootstrap
            document.documentElement.classList.add(stored === 'dark' ? 'theme-dark' : 'theme-light');
            return stored;
        }
        // default to light (or use OS preference if you want)
        document.documentElement.classList.add('theme-light');
        return 'light';
    }
}
