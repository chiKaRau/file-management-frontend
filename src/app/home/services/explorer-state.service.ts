// src/app/home/services/explorer-state.service.ts

import { Injectable } from '@angular/core';
import { DirectoryItem } from '../components/file-list/model/directory-item.model';

type ViewMode = 'extraLarge' | 'large' | 'medium' | 'small' | 'list' | 'details';


@Injectable({ providedIn: 'root' })
export class ExplorerStateService {
    selectedDirectory: string | null = null;
    directoryContents: DirectoryItem[] = [];
    errorMessage: string | null = null;
    infoMessage: string | null = null;
    isLoading: boolean = false;
    enableCivitaiMode = true;
    updateLocalPathEnabled: boolean = true;

    /** ⚠️ legacy (kept for backward compatibility) */
    viewMode: ViewMode = 'large';

    /** ✅ new: separate view modes */
    filesViewMode: ViewMode = 'large';
    foldersViewMode: ViewMode = 'large';

    fsSelectedDirectory: string | null = null;
    fsDirectoryContents: DirectoryItem[] = [];

    virtualSelectedDirectory: string | null = null;
    virtualDirectoryContents: DirectoryItem[] = [];

    constructor() {
        const savedFiles = localStorage.getItem('filesViewMode');
        const savedFolders = localStorage.getItem('foldersViewMode');
        const legacy = localStorage.getItem('viewMode'); // old single setting

        const isValid = (m: any): m is ViewMode =>
            ['extraLarge', 'large', 'medium', 'small', 'list', 'details'].includes(m);

        // files
        if (savedFiles && isValid(savedFiles)) {
            this.filesViewMode = savedFiles;
            this.viewMode = savedFiles;              // keep legacy mirror updated
        } else if (legacy && isValid(legacy)) {
            // migrate from old key
            this.filesViewMode = legacy;
            this.viewMode = legacy;
            localStorage.setItem('filesViewMode', legacy);
        }

        // folders
        if (savedFolders && isValid(savedFolders)) {
            this.foldersViewMode = savedFolders;
        }
    }

    /** legacy setter (still used in a few places) */
    saveViewMode(mode: string) {
        this.saveFilesViewMode(mode as ViewMode);
    }

    /** new explicit setters */
    saveFilesViewMode(mode: ViewMode) {
        this.filesViewMode = mode;
        this.viewMode = mode; // keep legacy in sync
        localStorage.setItem('filesViewMode', mode);
        localStorage.setItem('viewMode', mode); // optional but helps other old code
    }

    saveFoldersViewMode(mode: ViewMode) {
        this.foldersViewMode = mode;
        localStorage.setItem('foldersViewMode', mode);
    }

}
