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
            // --- Config: levels ---
            const maxLevelsRaw = Number(this.preferencesService.searchLevels);
            const maxLevels = (!isNaN(maxLevelsRaw) && maxLevelsRaw > 0) ? maxLevelsRaw : 999;

            // --- Build candidate roots (deep → shallow), capped by levels ---
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

            // --- Helpers ---
            const exists = (p: string) => {
                try { return fs.existsSync(p); } catch { return false; }
            };
            const SEP = path.sep;
            const norm = (p: string) => path.resolve(p).toLowerCase().replace(/[\\/]+/g, SEP);
            const startsWithin = (dir: string, root: string) => {
                // true if dir === root OR dir is inside root
                const d = norm(dir), r = norm(root);
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

            // Prepare ignore (exact path equality)
            const ignoreAbs = ignorePath ? path.resolve(ignorePath) : null;

            // --- Aggregated (cross-level) results ---
            const aggregatedSet = new Set<string>();
            const aggregatedArr = () => Array.from(aggregatedSet);

            // Previously scanned roots (to prune when scanning a parent)
            const scannedRootsNorm: string[] = [];

            const emit = (progress: string) => {
                this.zone.run(() => {
                    observer.next({ progress, results: aggregatedArr() });
                });
            };

            // Recursive walker that skips excluded subtrees and aggregates matches
            const searchCandidate = (root: string, excludeRootsNorm: string[]): Promise<void> => {
                return new Promise((resolve) => {
                    let pending = 0;

                    const shouldSkipDir = (dir: string) =>
                        excludeRootsNorm.some(ex => startsWithin(dir, ex));

                    const searchDirectory = (dir: string) => {
                        // Prune directories that are inside already-scanned roots
                        if (shouldSkipDir(dir)) return;

                        pending++;
                        emit(`Scanning directory: ${dir}`);

                        fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
                            if (err) {
                                // Soft-ignore common transient/permission errors
                                if (err.code !== 'ENOENT' && err.code !== 'EACCES' && err.code !== 'EPERM') {
                                    console.error('Error reading directory:', dir, err);
                                }
                                pending--;
                                if (pending === 0) resolve();
                                return;
                            }

                            for (const entry of entries) {
                                const fullPath = path.join(dir, entry.name);

                                if (ignoreAbs && path.resolve(fullPath) === ignoreAbs) {
                                    continue;
                                }

                                if (entry.isDirectory()) {
                                    // Skip excluded subtrees
                                    if (!shouldSkipDir(fullPath)) {
                                        searchDirectory(fullPath);
                                    }
                                } else {
                                    emit(`Processing file: ${fullPath}`);
                                    const prefix = `${modelId}_`;
                                    if (entry.name.startsWith(prefix)) {
                                        const abs = path.resolve(fullPath);
                                        if (!aggregatedSet.has(abs)) {
                                            aggregatedSet.add(abs);
                                            emit(`Matched file: ${fullPath}`);
                                        }
                                    }
                                }
                            }

                            pending--;
                            if (pending === 0) resolve();
                        });
                    };

                    // Kick off
                    searchDirectory(root);
                });
            };

            // --- Run: scan every candidate (up to cap), aggregate results, then complete ---
            const run = async () => {
                for (const root of candidateRoots) {
                    if (!exists(root)) { emit(`Skipping missing: ${root}`); continue; }
                    emit(`Searching in ${root}`);
                    await searchCandidate(root, scannedRootsNorm);
                    // Mark this root as scanned, so parents skip it as a subtree
                    scannedRootsNorm.push(norm(root));
                }
                this.zone.run(() => {
                    observer.next({ progress: 'Search finished for all levels.', results: aggregatedArr() });
                    observer.complete();
                });
            };

            run().catch(err => observer.error(err));
        });
    }


    updateScanDir(newDir: string): void {
        this.scanDir = newDir;
        console.log(`Scan directory updated to: ${this.scanDir}`);
    }
}
