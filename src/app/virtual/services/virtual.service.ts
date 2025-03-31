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

    setCurrentPath(path: string): void {
        this.currentPath = path;
    }

    getCurrentPath(): string {
        return this.currentPath;
    }

    // Note the inline type annotation so TypeScript expects an object with a payload property.
    getFiles(path: string): Observable<{ payload: any[] }> {
        return this.http.post<{ payload: any[] }>('http://localhost:3000/api/find-virtual-files', { path });
    }

    getDirectories(path: string): Observable<{ payload: any[] }> {
        return this.http.post<{ payload: any[] }>('http://localhost:3000/api/find-virtual-directories', { path });
    }
}
