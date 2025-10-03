// src/app/services/virtual.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';


export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class VirtualService {
    private currentPath: string = '';

    constructor(private http: HttpClient) { }

    setCurrentPath(path: string): void {
        this.currentPath = path;
    }

    getCurrentPath(): string {
        return this.currentPath;
    }

    getFiles(
        path: string,
        page: number,
        size: number,
        sortKey: 'name' | 'created' | 'modified' | 'myRating',
        sortDir: 'asc' | 'desc'
    ): Observable<{ payload: PageResponse<any> }> {
        return this.http.post<{ payload: PageResponse<any> }>(
            'http://localhost:3000/api/find-virtual-files',
            { path, page, size, sortKey, sortDir }
        );
    }

    getDirectories(path: string): Observable<{ payload: any[] }> {
        return this.http.post<{ payload: any[] }>('http://localhost:3000/api/find-virtual-directories', { path });
    }

    compareCombinations(combinations: string[][]): Observable<string[][]> {
        return this.http
            .post<{ payload: { matchedCombinations: string[][] } }>(
                'http://localhost:3000/api/compare-combination-to-pending-remove-tags-list',
                { combinations }
            )
            .pipe(
                tap(res => console.log('compareCombinations raw response:', res)),
                map(res => res.payload.matchedCombinations)
            );
    }

    /** Tell the server to add a new pending-remove tag */
    addPendingRemoveTag(tag: string): Observable<void> {
        return this.http
            .post<void>(
                'http://localhost:3000/api/add_pending_remove_tag',
                { pendingRemoveTag: tag }
            );
    }

}
