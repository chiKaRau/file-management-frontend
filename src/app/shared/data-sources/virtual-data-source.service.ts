// src/app/explorer/virtual-data-source.service.ts
import { Injectable } from '@angular/core';
import { ExplorerDataSource } from './data-source';
import { Observable, forkJoin, map } from 'rxjs';
import { VirtualService } from '../../virtual/services/virtual.service';
import { DirectoryItem } from '../../home/components/file-list/model/directory-item.model';


@Injectable()
export class VirtualDbDataSource implements ExplorerDataSource {
    readOnly = true;
    initialPath: string | null = '\\ACG\\';

    constructor(private virtualService: VirtualService) { }

    list(path: string | null): Observable<{ items: DirectoryItem[], selectedDirectory: string | null }> {
        const p = path ?? this.initialPath ?? '\\';

        return forkJoin({
            dirs: this.virtualService.getDirectories(p),
            files: this.virtualService.getFiles(p),
        }).pipe(
            map(({ dirs, files }) => {
                const dirPayload = (dirs && (dirs as any).payload) ? (dirs as any).payload : dirs;
                const filePayload = (files && (files as any).payload) ? (files as any).payload : files;

                const directories: DirectoryItem[] = Array.isArray(dirPayload)
                    ? dirPayload.map((d: any) => ({
                        isFile: false,
                        isDirectory: true,
                        name: d.directory,
                        path: p + (p.endsWith('\\') ? '' : '\\') + d.directory + '\\',
                        drive: d.drive
                    }))
                    : [];

                const fileItems: DirectoryItem[] = Array.isArray(filePayload)
                    ? filePayload.map((row: any) => {
                        const m = row.model;
                        return {
                            isFile: true,
                            isDirectory: false,
                            name: m?.name ?? '',
                            path: p + (p.endsWith('\\') ? '' : '\\') + (m?.name ?? ''),
                            drive: row.drive,
                            scanData: m,
                            imageUrl: (m?.imageUrls?.length ? m.imageUrls[0].url : undefined),
                            isDeleted: false
                        } as DirectoryItem;
                    })
                    : [];

                return { items: [...directories, ...fileItems], selectedDirectory: p };
            })
        );
    }
}
