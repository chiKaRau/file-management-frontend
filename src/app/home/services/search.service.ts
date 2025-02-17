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
     * Recursively searches for files starting with "<modelId>_" (you can include versionId if needed).
     * When a hintPath is provided, it builds candidate search roots:
     *
     *   1. First candidate: scanDir + hintPath (e.g. ...\ACG\Appearance\Mud)
     *   2. Next candidate: its parent directory (e.g. ...\ACG\Appearance)
     *   3. Finally: the full scanDir.
     *
     * It searches each candidate sequentially and stops as soon as any candidate returns a match.
     */
    searchByModelAndVersion(modelId: string, versionId: string, hintPath?: string): Observable<SearchProgress> {
        return new Observable((observer: Observer<SearchProgress>) => {
            // Build candidate search roots based on the hint (if provided)
            let candidateRoots: string[] = [];
            if (hintPath) {
                // For example, if hintPath is "Appearance/Mud" and scanDir is ".../ACG"
                let candidate = path.join(this.scanDir, hintPath);
                while (candidate && candidate.startsWith(this.scanDir)) {
                    candidateRoots.push(candidate);
                    // Stop if we've reached the scanDir itself
                    if (candidate === this.scanDir) break;
                    candidate = path.dirname(candidate);
                }
                // Ensure the scanDir is included as the last candidate.
                if (candidateRoots[candidateRoots.length - 1] !== this.scanDir) {
                    candidateRoots.push(this.scanDir);
                }
            } else {
                candidateRoots = [this.scanDir];
            }

            // Helper: search the given root recursively and return a Promise that resolves with the matches.
            const searchCandidate = (root: string): Promise<string[]> => {
                return new Promise((resolve, reject) => {
                    const results: string[] = [];
                    let pending = 0;

                    const searchDirectory = (dir: string) => {
                        pending++;
                        // Emit progress update for scanning the directory
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
                                if (entry.isDirectory()) {
                                    // Recursively search subdirectories
                                    searchDirectory(fullPath);
                                } else {
                                    this.zone.run(() => {
                                        observer.next({ progress: `Processing file: ${fullPath}`, results: [...results] });
                                    });
                                    // Use modelId as the prefix (you can also include versionId if needed)
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
                        // If matches were found in this candidate, report and stop searching.
                        this.zone.run(() => {
                            observer.next({ progress: `Matches found in ${root}`, results: candidateResults });
                            observer.complete();
                        });
                        return;
                    }
                }
                // If none of the candidate roots yielded matches, emit a “not found” message.
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
