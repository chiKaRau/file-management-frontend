// src/app/explorer/fs-data-source.service.ts
import { Injectable } from '@angular/core';
import { ExplorerDataSource } from './data-source';
import { Observable, from } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { DirectoryItem } from '../../home/components/file-list/model/directory-item.model';

@Injectable()
export class FsDataSource implements ExplorerDataSource {
    readOnly = false;
    initialPath: string | null = null;

    private getCreatedTime(stats: fs.Stats): Date {
        return stats.birthtime && stats.birthtime.getTime() > 0 ? stats.birthtime : stats.ctime;
    }

    list(dir: string | null): Observable<{ items: DirectoryItem[], selectedDirectory: string | null }> {
        if (!dir) {
            // no directory chosen yet
            return from(Promise.resolve({ items: [], selectedDirectory: null }));
        }

        const load = async (): Promise<{ items: DirectoryItem[], selectedDirectory: string | null }> => {
            const files = await fs.promises.readdir(dir);
            const entries = await Promise.all(
                files.map(async (file) => {
                    const fullPath = path.join(dir, file);
                    try {
                        const stats = await fs.promises.stat(fullPath);
                        const isFile = stats.isFile();
                        return {
                            name: file,
                            path: fullPath,
                            isFile,
                            isDirectory: !isFile,
                            size: isFile ? stats.size : undefined,
                            createdAt: this.getCreatedTime(stats),
                            modifiedAt: stats.mtime
                        } as DirectoryItem;
                    } catch {
                        return null;
                    }
                })
            );
            return { items: (entries.filter(Boolean) as DirectoryItem[]), selectedDirectory: dir };
        };

        return from(load());
    }
}
