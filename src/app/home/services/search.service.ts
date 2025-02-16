// src/app/services/search.service.ts
import { Injectable, NgZone } from '@angular/core';
import * as fs from 'fs';
import * as path from 'path';
import { Observable, Observer } from 'rxjs';
import { PreferencesService } from '../../preferences/preferences.service';

export interface SearchProgress {
    progress: string;    // A message showing the current folder/file being processed
    results: string[];   // Collected file paths matching the search criteria so far
}

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    // Hard-coded root scan directory (adjust as needed)
    private scanDir: string;

    constructor(private zone: NgZone, private preferencesService: PreferencesService) {
        // Use the scanDir from preferences
        this.scanDir = this.preferencesService.scanDir;
    }
    /**
     * Recursively searches the scanDir for files that start with
     * "<modelId>_<versionId>_". It emits progress updates as it scans.
     */
    searchByModelAndVersion(modelId: string, versionId: string): Observable<SearchProgress> {
        return new Observable((observer: Observer<SearchProgress>) => {
            const results: string[] = [];
            let pending = 0;

            const searchDirectory = (dir: string) => {
                pending++;
                // Wrap in NgZone to trigger change detection
                this.zone.run(() => {
                    observer.next({ progress: `Scanning directory: ${dir}`, results: [...results] });
                });

                fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
                    if (err) {
                        console.error('Error reading directory:', dir, err);
                        pending--;
                        if (pending === 0) {
                            this.zone.run(() => {
                                observer.next({ progress: 'Scanning complete.', results: [...results] });
                                observer.complete();
                            });
                        }
                        return;
                    }

                    entries.forEach(entry => {
                        const fullPath = path.join(dir, entry.name);
                        if (entry.isDirectory()) {
                            // Recursively search subdirectories
                            searchDirectory(fullPath);
                        } else {
                            // Emit a progress update for the file being processed
                            this.zone.run(() => {
                                observer.next({ progress: `Processing file: ${fullPath}`, results: [...results] });
                            });
                            // Check if file name starts with "<modelId>_
                            // const prefix = `${modelId}_${versionId}_`;
                            const prefix = `${modelId}_`;
                            if (entry.name.startsWith(prefix)) {
                                results.push(fullPath);
                                this.zone.run(() => {
                                    observer.next({ progress: `Matched file: ${fullPath}`, results: [...results] });
                                });
                            }
                        }
                    });

                    pending--;
                    if (pending === 0) {
                        this.zone.run(() => {
                            observer.next({ progress: 'Scanning complete.', results: [...results] });
                            observer.complete();
                        });
                    }
                });
            };

            // Start scanning from the root scan directory.
            searchDirectory(this.scanDir);
        });
    }

    updateScanDir(newDir: string): void {
        this.scanDir = newDir;
        console.log(`Scan directory updated to: ${this.scanDir}`);
    }

}
