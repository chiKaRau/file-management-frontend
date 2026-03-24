// src/app/services/search.service.ts
import { Injectable, NgZone } from '@angular/core';
import * as fs from 'fs';
import * as path from 'path';
import { Observable, Observer } from 'rxjs';
import { PreferencesService } from '../../preferences/preferences.service';

export interface SearchProgress {
    progress: string;
    results: string[];
}

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    private scanDir: string;

    constructor(private zone: NgZone, private preferencesService: PreferencesService) {
        this.scanDir = this.preferencesService.scanDir;
    }

    private normalizeBaseName(filePath: string): string {
        const parsed = path.parse(filePath);
        let base = parsed.name;
        const previewSuffix = '.preview';
        if (base.toLowerCase().endsWith(previewSuffix)) {
            base = base.substring(0, base.length - previewSuffix.length);
        }
        return base;
    }

    searchByModelAndVersion(
        modelId: string,
        versionId: string,
        hintPath?: string,
        ignorePath?: string
    ): Observable<SearchProgress> {
        return new Observable((observer: Observer<SearchProgress>) => {
            let cancelled = false;

            const maxLevelsRaw = Number(this.preferencesService.searchLevels);
            const maxLevels = (!isNaN(maxLevelsRaw) && maxLevelsRaw > 0) ? maxLevelsRaw : 999;

            // Build candidate roots exactly like before: deep -> shallow, capped by levels
            let candidateRoots: string[] = [];
            if (hintPath) {
                let candidate = path.join(this.scanDir, hintPath);
                let levels = 0;

                while (candidate && candidate.startsWith(this.scanDir) && levels < maxLevels) {
                    candidateRoots.push(candidate);
                    levels++;
                    if (candidate === this.scanDir) break;
                    candidate = path.dirname(candidate);
                }
            } else {
                candidateRoots = [this.scanDir];
            }

            const exists = (p: string) => {
                try {
                    return fs.existsSync(p);
                } catch {
                    return false;
                }
            };

            const SEP = path.sep;
            const norm = (p: string) => path.resolve(p).toLowerCase().replace(/[\\/]+/g, SEP);
            const startsWithin = (dir: string, root: string) => {
                const d = norm(dir);
                const r = norm(root);
                return d === r || d.startsWith(r + SEP);
            };

            // Keep only existing, de-duped candidate roots
            const seen = new Set<string>();
            candidateRoots = candidateRoots
                .map(p => path.resolve(p))
                .filter(p => {
                    const n = norm(p);
                    if (seen.has(n)) return false;
                    seen.add(n);
                    return exists(p);
                });

            console.log('Candidate roots (existing):', candidateRoots);

            const ignoreAbs = ignorePath ? path.resolve(ignorePath) : null;

            // Same aggregated cross-level results as before
            const aggregatedSet = new Set<string>();
            const aggregatedArr = () => Array.from(aggregatedSet);

            // Previously scanned roots; parents skip already-scanned subtrees
            const scannedRootsNorm: string[] = [];

            // Throttled progress emission to reduce Angular churn
            let lastProgress = 'Preparing search...';
            let flushTimer: ReturnType<typeof setTimeout> | null = null;

            const flushProgress = (force = false) => {
                if (cancelled) return;

                if (force) {
                    if (flushTimer) {
                        clearTimeout(flushTimer);
                        flushTimer = null;
                    }
                    this.zone.run(() => {
                        observer.next({ progress: lastProgress, results: aggregatedArr() });
                    });
                    return;
                }

                if (flushTimer) return;

                flushTimer = setTimeout(() => {
                    flushTimer = null;
                    if (cancelled) return;
                    this.zone.run(() => {
                        observer.next({ progress: lastProgress, results: aggregatedArr() });
                    });
                }, 150);
            };

            const emit = (progress: string, force = false) => {
                lastProgress = progress;
                flushProgress(force);
            };

            const searchCandidate = (root: string, excludeRootsNorm: string[]): Promise<void> => {
                return new Promise((resolve) => {
                    let pending = 0;
                    let scannedDirCount = 0;

                    const shouldSkipDir = (dir: string) =>
                        excludeRootsNorm.some(ex => startsWithin(dir, ex));

                    const searchDirectory = (dir: string) => {
                        if (cancelled) return;
                        if (shouldSkipDir(dir)) return;

                        pending++;
                        scannedDirCount++;

                        // Emit directory progress only occasionally
                        if (scannedDirCount === 1 || scannedDirCount % 25 === 0) {
                            emit(`Scanning directory: ${dir}`);
                        }

                        fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
                            if (cancelled) {
                                pending--;
                                if (pending === 0) resolve();
                                return;
                            }

                            if (err) {
                                if (err.code !== 'ENOENT' && err.code !== 'EACCES' && err.code !== 'EPERM') {
                                    console.error('Error reading directory:', dir, err);
                                }
                                pending--;
                                if (pending === 0) resolve();
                                return;
                            }

                            for (const entry of entries) {
                                if (cancelled) break;

                                const fullPath = path.join(dir, entry.name);

                                if (ignoreAbs && path.resolve(fullPath) === ignoreAbs) {
                                    continue;
                                }

                                if (entry.isDirectory()) {
                                    if (!shouldSkipDir(fullPath)) {
                                        searchDirectory(fullPath);
                                    }
                                } else {
                                    const prefix = `${modelId}_`;

                                    if (entry.name.startsWith(prefix)) {
                                        const abs = path.resolve(fullPath);
                                        if (!aggregatedSet.has(abs)) {
                                            aggregatedSet.add(abs);
                                            // Force immediate update when a new match is found
                                            emit(`Matched file: ${fullPath}`, true);
                                        }
                                    }
                                }
                            }

                            pending--;
                            if (pending === 0) resolve();
                        });
                    };

                    searchDirectory(root);
                });
            };

            const run = async () => {
                for (const root of candidateRoots) {
                    if (cancelled) return;

                    if (!exists(root)) {
                        emit(`Skipping missing: ${root}`, true);
                        continue;
                    }

                    emit(`Searching in ${root}`, true);
                    await searchCandidate(root, scannedRootsNorm);

                    // Same logic as before: mark root scanned so parents skip it
                    scannedRootsNorm.push(norm(root));
                }

                if (cancelled) return;

                emit('Search finished for all levels.', true);
                this.zone.run(() => {
                    observer.complete();
                });
            };

            this.zone.runOutsideAngular(() => {
                run().catch(err => {
                    this.zone.run(() => observer.error(err));
                });
            });

            return () => {
                cancelled = true;
                if (flushTimer) {
                    clearTimeout(flushTimer);
                    flushTimer = null;
                }
            };
        });
    }

    updateScanDir(newDir: string): void {
        this.scanDir = newDir;
        console.log(`Scan directory updated to: ${this.scanDir}`);
    }
}