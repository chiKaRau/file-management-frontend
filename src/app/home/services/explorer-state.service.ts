// src/app/home/services/explorer-state.service.ts

import { Injectable } from '@angular/core';

export interface DirectoryItem {
    name: string;
    path: string;
    isFile: boolean;
    isDirectory: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExplorerStateService {
    selectedDirectory: string | null = null;
    directoryContents: DirectoryItem[] = [];
    errorMessage: string | null = null;
    infoMessage: string | null = null;
    isLoading: boolean = false;

    constructor() {
        // Optionally do any initialization here
    }
}
