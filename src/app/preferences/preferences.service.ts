import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class PreferencesService {
    storageDir: string = '';
    deleteDir: string = '';
    updateDir: string = '';
    scanDir: string = '';

    scanVerified: boolean = false;
    storageVerified: boolean = false;
    deleteVerified: boolean = false;
    updateVerified: boolean = false;

    constructor() { }
}
