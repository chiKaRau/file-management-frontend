// src/app/home/services/explorer-state.service.ts

import { Injectable } from '@angular/core';
import { DirectoryItem } from '../components/file-list/model/directory-item.model';

@Injectable({ providedIn: 'root' })
export class ExplorerStateService {
    selectedDirectory: string | null = null;
    directoryContents: DirectoryItem[] = [];
    errorMessage: string | null = null;
    infoMessage: string | null = null;
    isLoading: boolean = false;
    enableCivitaiMode = true;
    updateLocalPathEnabled: boolean = true;

    viewMode: 'extraLarge' | 'large' | 'medium' | 'small' | 'list' | 'details' = 'large';

    constructor() {
        const savedViewMode = localStorage.getItem('viewMode');
        if (savedViewMode) {
            // Make sure it's one of the valid strings
            if (['extraLarge', 'large', 'medium', 'small', 'list', 'details'].includes(savedViewMode)) {
                this.viewMode = savedViewMode as any;
            }
        }
    }

    saveViewMode(mode: string) {
        this.viewMode = mode as any;
        // Also persist it
        localStorage.setItem('viewMode', mode);
    }

}
