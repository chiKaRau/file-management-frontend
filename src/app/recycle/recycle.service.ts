import { Injectable } from '@angular/core';
import { RecycleRecord } from './model/recycle-record.model';
import * as fs from 'fs';
import * as path from 'path';

@Injectable({
    providedIn: 'root'
})
export class RecycleService {
    private records: RecycleRecord[] = [];
    private storagePath: string;
    private deleteFolderPath: string;


    constructor() {
        // Use __dirname to calculate the project root.
        // Based on your logs, this should resolve to:
        // F:\Coding Projects\File-management\file-management-frontend
        const projectRoot = path.resolve(__dirname, '../');
        console.log('Project Root:', projectRoot);

        // Build the recycle bin storage path:
        // F:\Coding Projects\File-management\file-management-frontend\src\data\recycle-bin.json
        this.storagePath = path.join(projectRoot, 'src', 'data', 'recycle-bin.json');
        console.log('Recycle bin storage path:', this.storagePath);

        // Ensure the data directory exists.
        const dataDirectory = path.dirname(this.storagePath);
        if (!fs.existsSync(dataDirectory)) {
            fs.mkdirSync(dataDirectory, { recursive: true });
            console.log('Created data directory:', dataDirectory);
        }

        // Create the recycle-bin.json file if it does not exist.
        if (!fs.existsSync(this.storagePath)) {
            try {
                fs.writeFileSync(this.storagePath, JSON.stringify([], null, 2));
                console.log('Recycle bin file created at:', this.storagePath);
            } catch (err) {
                console.error('Error creating recycle bin file:', err);
            }
        }

        // Build the delete folder path:
        // F:\Coding Projects\File-management\file-management-frontend\src\delete
        this.deleteFolderPath = path.join(projectRoot, 'src', 'delete');
        console.log('Delete folder path:', this.deleteFolderPath);
        if (!fs.existsSync(this.deleteFolderPath)) {
            fs.mkdirSync(this.deleteFolderPath, { recursive: true });
            console.log('Created delete folder at:', this.deleteFolderPath);
        }

        this.loadRecords();
    }

    private loadRecords(): void {
        if (fs.existsSync(this.storagePath)) {
            try {
                const data = fs.readFileSync(this.storagePath, 'utf-8');
                this.records = JSON.parse(data);
            } catch (err) {
                console.error('Error reading recycle bin file:', err);
                this.records = [];
            }
        } else {
            this.records = [];
        }
    }

    private saveRecords(): void {
        try {
            fs.writeFileSync(this.storagePath, JSON.stringify(this.records, null, 2));
        } catch (err) {
            console.error('Error writing recycle bin file:', err);
        }
    }

    getRecords(): RecycleRecord[] {
        return this.records;
    }

    getRecordsByType(type: 'set' | 'directory'): RecycleRecord[] {
        return this.records.filter(record => record.type === type);
    }

    addRecord(record: RecycleRecord): void {
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
                    // Ensure the file exists before attempting to move it.
                    if (fs.existsSync(filePath)) {
                        const fileName = path.basename(filePath);
                        const targetPath = path.join(this.deleteFolderPath, fileName);
                        // Attempt to move the file using renameSync.
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
                            // Only remove the original if the copy was successful.
                            fs.unlinkSync(filePath);
                            console.log(`Copied and removed file ${filePath} to ${targetPath} as a fallback.`);
                        }
                    } catch (fallbackErr) {
                        console.error(`Fallback error processing file ${filePath}:`, fallbackErr);
                        // At this point, the file remains in its original location.
                        // You may choose to mark this record for manual review or add additional recovery logic.
                    }
                }
            });
            // After processing all files, remove the record from the recycle bin.
            this.records = this.records.filter(r => r.id !== recordId);
            this.saveRecords();
        }
    }

}
