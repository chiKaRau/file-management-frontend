import { Injectable } from '@angular/core';

// Use Electron's runtime require to access ipcRenderer.
declare var window: any;
const { ipcRenderer } = window.require('electron');

@Injectable({
    providedIn: 'root'
})
export class ZipService {
    /**
     * Calls the main process to zip the given files into outputZipPath.
     * progressCallback is invoked with progress (0–100).
     */
    zipFiles(
        files: string[],
        outputZipPath: string,
        progressCallback: (progress: number) => void
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            // Remove any previous listeners
            ipcRenderer.removeAllListeners('zip-progress');
            ipcRenderer.removeAllListeners('zip-complete');
            ipcRenderer.removeAllListeners('zip-error');

            // Listen for progress events.
            ipcRenderer.on('zip-progress', (event: any, percent: number) => {
                progressCallback(percent);
            });

            ipcRenderer.once('zip-complete', (event: any, data: any) => {
                resolve(data);
            });
            ipcRenderer.once('zip-error', (event: any, error: any) => {
                reject(error);
            });

            // Send the zip request to the main process.
            ipcRenderer.send('zip-files', files, outputZipPath);
        });
    }
}
