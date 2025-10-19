import { Injectable } from '@angular/core';
import { Theme } from '../home/services/theme.service';

@Injectable({
    providedIn: 'root'
})
export class PreferencesService {
    storageDir: string = '';
    deleteDir: string = '';
    updateDir: string = '';
    scanDir: string = '';

    theme: Theme = (localStorage.getItem('app-theme') as Theme) || 'dark';

    scanVerified: boolean = false;
    storageVerified: boolean = false;
    deleteVerified: boolean = false;
    updateVerified: boolean = false;

    // NEW: persist searchLevels like theme
    private _searchLevels = Number(localStorage.getItem('search-levels') ?? '999');

    get searchLevels(): number {
        const n = Number(this._searchLevels);
        return Number.isFinite(n) && n > 0 ? n : 999;
    }
    set searchLevels(val: number) {
        const n = Number(val);
        this._searchLevels = Number.isFinite(n) && n > 0 ? n : 999;
        localStorage.setItem('search-levels', String(this._searchLevels));
    }

    constructor() { }
}
