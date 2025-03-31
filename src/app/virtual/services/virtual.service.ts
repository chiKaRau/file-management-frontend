// virtual.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class VirtualService {
    private currentPath: string = '';

    constructor(private http: HttpClient) { }

    // Persist the current path
    setCurrentPath(path: string): void {
        this.currentPath = path;
    }

    getCurrentPath(): string {
        return this.currentPath;
    }

    // API call to fetch directories
    getDirectories(path: string): Observable<any[]> {
        return this.http.post<any[]>('http://localhost:3000/api/find-virtual-directories', { path });
    }

    // API call to fetch files
    getFiles(path: string): Observable<any[]> {
        return this.http.post<any[]>('http://localhost:3000/api/find-virtual-files', { path });
    }
}
