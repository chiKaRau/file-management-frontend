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

    constructor() { }
}
