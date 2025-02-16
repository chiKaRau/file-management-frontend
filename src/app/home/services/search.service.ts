// src/app/services/search.service.ts
import { Injectable } from '@angular/core';
import * as fs from 'fs';
import * as path from 'path';
import { Observable, Observer } from 'rxjs';

export interface SearchProgress {
    progress: string;    // A message showing the current folder/file being processed
    results: string[];   // Collected file paths matching the search criteria so far
}

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    // Hard-coded root scan directory (adjust as needed)
    private scanDir: string = 'F:\\Coding Projects\\Java\\CivitaiSQL Server\\server\\files\\download\\@scan@';

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
                observer.next({ progress: `Scanning directory: ${dir}`, results: [...results] });
                fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
                    if (err) {
                        console.error('Error reading directory:', dir, err);
                        // Continue scanning despite errors:
                        pending--;
                        if (pending === 0) {
                            observer.next({ progress: 'Scanning complete.', results: [...results] });
                            observer.complete();
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
                            observer.next({ progress: `Processing file: ${fullPath}`, results: [...results] });
                            // Check if file name starts with "<modelId>_<versionId>_"
                            const prefix = `${modelId}_${versionId}_`;
                            if (entry.name.startsWith(prefix)) {
                                results.push(fullPath);
                                observer.next({ progress: `Matched file: ${fullPath}`, results: [...results] });
                            }
                        }
                    });

                    pending--;
                    if (pending === 0) {
                        observer.next({ progress: 'Scanning complete.', results: [...results] });
                        observer.complete();
                    }
                });
            };

            // Start scanning from the root scan directory.
            searchDirectory(this.scanDir);
        });
    }
}
