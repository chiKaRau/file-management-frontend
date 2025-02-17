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
    // The root directory to scan (from user preferences)
    private scanDir: string;

    constructor(private zone: NgZone, private preferencesService: PreferencesService) {
        this.scanDir = this.preferencesService.scanDir;
    }

    /**
     * Normalizes a file's base name.
     *
     * If the file's base name ends with ".preview", remove that segment.
     * For example:
     *   "somefile.preview" becomes "somefile"
     *   "somefile" remains "somefile"
     *
     * @param filePath Full file path.
     * @returns Normalized base name.
     */
    private normalizeBaseName(filePath: string): string {
        const parsed = path.parse(filePath);
        let base = parsed.name; // e.g. "1208241_1360770_Illustrious_center-axis-relock-stance-illustriousxl-lora-nochekaiser.preview"
        const previewSuffix = '.preview';
        if (base.toLowerCase().endsWith(previewSuffix)) {
            base = base.substring(0, base.length - previewSuffix.length);
        }
        return base;
    }

    /**
     * Recursively searches for files starting with "<modelId>_" (you can include versionId if needed).
     * When a hintPath is provided, it builds candidate search roots:
     *
     *   1. First candidate: scanDir + hintPath (e.g. ...\ACG\Appearance\Mud)
     *   2. Next candidate: its parent directory (e.g. ...\ACG\Appearance)
     *   3. Finally: the full scanDir.
     *
     * It searches each candidate sequentially and stops as soon as any candidate returns a match.
     *
     * @param modelId The model ID to search for.
     * @param versionId The version ID (currently unused in the prefix, but available).
     * @param hintPath An optional hint path (relative) to narrow the search.
     * @param ignorePath An optional full path of the selected file; any file whose normalized base name
     *                   matches that of ignorePath will be skipped.
     */
    searchByModelAndVersion(
        modelId: string,
        versionId: string,
        hintPath?: string,
        ignorePath?: string
    ): Observable<SearchProgress> {
        return new Observable((observer: Observer<SearchProgress>) => {
            // Build candidate search roots based on the hint (if provided)
            let candidateRoots: string[] = [];
            if (hintPath) {
                let candidate = path.join(this.scanDir, hintPath);
                while (candidate && candidate.startsWith(this.scanDir)) {
                    candidateRoots.push(candidate);
                    if (candidate === this.scanDir) break;
                    candidate = path.dirname(candidate);
                }
                if (candidateRoots[candidateRoots.length - 1] !== this.scanDir) {
                    candidateRoots.push(this.scanDir);
                }
            } else {
                candidateRoots = [this.scanDir];
            }

            // Prepare the ignore base name if ignorePath is provided.
            const ignoreBase = ignorePath ? this.normalizeBaseName(ignorePath) : null;

            // Helper: search the given root recursively and return a Promise that resolves with the matches.
            const searchCandidate = (root: string): Promise<string[]> => {
                return new Promise((resolve, reject) => {
                    const results: string[] = [];
                    let pending = 0;

                    const searchDirectory = (dir: string) => {
                        pending++;
                        this.zone.run(() => {
                            observer.next({ progress: `Scanning directory: ${dir}`, results: [...results] });
                        });
                        fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
                            if (err) {
                                console.error('Error reading directory:', dir, err);
                                pending--;
                                if (pending === 0) {
                                    resolve(results);
                                }
                                return;
                            }
                            entries.forEach(entry => {
                                const fullPath = path.join(dir, entry.name);

                                if (!entry.isDirectory()) {
                                    // Normalize the current file's base name.
                                    const currentBase = this.normalizeBaseName(fullPath);
                                    if (ignoreBase && currentBase === ignoreBase) {
                                        // Skip this file because its normalized base name matches the ignore file.
                                        return;
                                    }
                                }

                                if (entry.isDirectory()) {
                                    searchDirectory(fullPath);
                                } else {
                                    this.zone.run(() => {
                                        observer.next({ progress: `Processing file: ${fullPath}`, results: [...results] });
                                    });
                                    // Check if file name starts with the modelId (or modelId_ if desired)
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
                                resolve(results);
                            }
                        });
                    };

                    searchDirectory(root);
                });
            };

            // Sequentially search the candidate roots.
            const runSequentialSearch = async () => {
                for (const root of candidateRoots) {
                    this.zone.run(() => {
                        observer.next({ progress: `Searching in ${root}`, results: [] });
                    });
                    const candidateResults = await searchCandidate(root);
                    if (candidateResults.length > 0) {
                        this.zone.run(() => {
                            observer.next({ progress: `Matches found in ${root}`, results: candidateResults });
                            observer.complete();
                        });
                        return;
                    }
                }
                this.zone.run(() => {
                    observer.next({ progress: 'No matches found.', results: [] });
                    observer.complete();
                });
            };

            runSequentialSearch().catch(err => observer.error(err));
        });
    }

    updateScanDir(newDir: string): void {
        this.scanDir = newDir;
        console.log(`Scan directory updated to: ${this.scanDir}`);
    }
}
