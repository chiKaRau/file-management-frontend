// src/app/explorer/virtual-data-source.service.ts
import { Injectable } from '@angular/core';
import { ExplorerDataSource } from './data-source';
import { Observable, forkJoin, map, of } from 'rxjs';
import { PageResponse, VirtualService } from '../../virtual/services/virtual.service';
import { DirectoryItem } from '../../home/components/file-list/model/directory-item.model';

@Injectable()
export class VirtualDbDataSource implements ExplorerDataSource {
    readOnly = true;
    initialPath: string | null = '\\ACG\\';

    constructor(private virtualService: VirtualService) { }

    list(
        path: string | null,
        opts?: {
            page?: number;
            size?: number;
            sortKey?: 'name' | 'created' | 'modified' | 'myRating' | 'size' | 'modelNumber' | 'versionNumber';
            sortDir?: 'asc' | 'desc';
            query?: string;                    // 👈 NEW: optional server-side search term
        }
    ): Observable<{
        items: DirectoryItem[];
        selectedDirectory: string | null;
        page?: number;
        size?: number;
        totalPages?: number;
        totalElements?: number;
    }> {
        const p = path ?? this.initialPath ?? '\\';
        const page = opts?.page ?? 0;
        const size = opts?.size ?? 100;

        // map UI sort to server sort (Virtual doesn't support 'size')
        const sortKey:
            'name' | 'created' | 'modified' | 'myRating' | 'modelNumber' | 'versionNumber' =
            opts?.sortKey === 'created' ? 'created'
                : opts?.sortKey === 'modified' ? 'modified'
                    : opts?.sortKey === 'myRating' ? 'myRating'
                        : opts?.sortKey === 'modelNumber' ? 'modelNumber'
                            : opts?.sortKey === 'versionNumber' ? 'versionNumber'
                                : 'name';

        const sortDir: 'asc' | 'desc' = opts?.sortDir === 'desc' ? 'desc' : 'asc';

        // In search mode, we don't show directories (only files)
        const inSearch = !!opts?.query && opts.query.trim().length > 0;

        // fetch directories only for the first page AND not in search mode
        const dirs$ = page === 0 && !inSearch
            ? this.virtualService.getDirectories(p).pipe(
                map((res) => {
                    const dirPayload = (res && (res as any).payload) ? (res as any).payload : res;
                    return Array.isArray(dirPayload)
                        ? dirPayload.map((d: any) => ({
                            isFile: false,
                            isDirectory: true,
                            name: d.directory,
                            path: p + (p.endsWith('\\') ? '' : '\\') + d.directory + '\\',
                            drive: d.drive,
                            // NEW: let HomeComponent.compareItems sort dirs meaningfully:
                            createdAt: d.dirCreatedAt ? new Date(d.dirCreatedAt) : undefined,
                            modifiedAt: d.dirModifiedAt ? new Date(d.dirModifiedAt) : undefined,
                            myRating: Number.isFinite(d.dirRatingAvg) ? d.dirRatingAvg : undefined
                        } as DirectoryItem))
                        : [];

                })
            )
            : of<DirectoryItem[]>([]);

        // 👇 pass opts?.query through to the backend
        const files$ = this.virtualService
            .getFiles(p, page, size, sortKey, sortDir, opts?.query)
            .pipe(
                map((res) => {
                    const pl = (res as any).payload;
                    if (pl && Array.isArray(pl)) {
                        // fallback: server returned a plain array => synthesize 1-page response
                        const content = pl;
                        return {
                            content,
                            page: 0,
                            size: content.length,
                            totalElements: content.length,
                            totalPages: 1,
                            hasNext: false,
                            hasPrevious: false
                        } as PageResponse<any>;
                    }
                    return pl as PageResponse<any>;
                })
            );

        return forkJoin({ dirs: dirs$, filesPr: files$ }).pipe(
            map(({ dirs, filesPr }) => {
                const fileItems: DirectoryItem[] = Array.isArray(filesPr?.content)
                    ? filesPr.content.map((row: any) => {
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

                // if page=0 and not searching, prepend directories; otherwise only files
                const items = page === 0 && !inSearch ? [...dirs, ...fileItems] : fileItems;

                return {
                    items,
                    selectedDirectory: p,
                    page: filesPr?.page,
                    size: filesPr?.size,
                    totalPages: filesPr?.totalPages,
                    totalElements: filesPr?.totalElements
                };
            })
        );
    }
}
