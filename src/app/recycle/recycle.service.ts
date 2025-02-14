import { Injectable } from '@angular/core';
import { RecycleRecord } from './model/recycle-record.model';
import * as fs from 'fs';
import * as path from 'path';

@Injectable({
    providedIn: 'root'
})
export class RecycleService {
    private records: RecycleRecord[] = [];
    private storagePath: string = '';       // Full file path for JSON
    private deleteFolderPath: string = '';    // Delete folder directory

    constructor() {
        // Initially, do nothing since paths are not set.
    }

    setPaths(storageDir: string, deleteDir: string): void {
        storageDir = storageDir.trim();
        deleteDir = deleteDir.trim();

        if (!storageDir || !deleteDir) {
            console.warn('Either storageDir or deleteDir is empty. Skipping path setup.');
            return;
        }

        // Build the full file path for the recycle bin JSON file.
        // (Assuming storageDir is the base path that already includes @scan@)
        this.storagePath = path.join(storageDir, 'data', 'recycle-bin.json');
        // For delete, since you want the directory under @scan@:
        this.deleteFolderPath = path.join(deleteDir, 'delete');

        // Optionally, you can verify here again if needed, but if your verify function already did that,
        // then this is just to update the service's internal state.
    }

    // private loadRecords(): void {
    //     if (this.storagePath && fs.existsSync(this.storagePath)) {
    //         try {
    //             const data = fs.readFileSync(this.storagePath, 'utf-8');
    //             this.records = JSON.parse(data);
    //         } catch (err) {
    //             console.error('Error reading recycle bin file:', err);
    //             this.records = [];
    //         }
    //     } else {
    //         this.records = [];
    //     }
    // }

    private saveRecords(): void {
        if (this.storagePath) {
            try {
                fs.writeFileSync(this.storagePath, JSON.stringify(this.records, null, 2));
            } catch (err) {
                console.error('Error writing recycle bin file:', err);
            }
        }
    }

    getRecords(): RecycleRecord[] {
        return this.records;
    }

    getRecordsByType(type: 'set' | 'directory'): RecycleRecord[] {
        return this.records.filter(record => record.type === type);
    }

    addRecord(record: RecycleRecord): void {
        // Check if a record for the same original path already exists
        const exists = this.records.some(r => r.originalPath === record.originalPath);
        if (exists) {
            console.warn(`Record for ${record.originalPath} already exists. Skipping duplicate.`);
            return;
        }

        this.records.push(record);
        this.saveRecords();
    }

    restoreRecord(recordId: string): void {
        const index = this.records.findIndex(r => r.id === recordId);
        if (index !== -1) {
            this.records.splice(index, 1);
            this.saveRecords();
        }
    }

    deletePermanently(recordId: string): void {
        const record = this.records.find(r => r.id === recordId);
        if (record) {
            record.files.forEach(filePath => {
                try {
                    if (fs.existsSync(filePath)) {
                        const fileName = path.basename(filePath);
                        const targetPath = path.join(this.deleteFolderPath, fileName);
                        fs.renameSync(filePath, targetPath);
                        console.log(`Moved file ${filePath} to ${targetPath}`);
                    } else {
                        console.warn(`File not found: ${filePath}`);
                    }
                } catch (err) {
                    console.error(`Error moving file ${filePath} using renameSync:`, err);
                    // Fallback: try copying the file and then deleting the original.
                    try {
                        if (fs.existsSync(filePath)) {
                            const fileName = path.basename(filePath);
                            const targetPath = path.join(this.deleteFolderPath, fileName);
                            fs.copyFileSync(filePath, targetPath);
                            fs.unlinkSync(filePath);
                            console.log(`Copied and removed file ${filePath} to ${targetPath} as a fallback.`);
                        }
                    } catch (fallbackErr) {
                        console.error(`Fallback error processing file ${filePath}:`, fallbackErr);
                    }
                }
            });
            this.records = this.records.filter(r => r.id !== recordId);
            this.saveRecords();
        }
    }

    public get arePathsSet(): boolean {
        // Check that storagePath and deleteFolderPath are set and not empty strings.
        return this.storagePath.trim() !== '' && this.deleteFolderPath.trim() !== '';
    }

}
