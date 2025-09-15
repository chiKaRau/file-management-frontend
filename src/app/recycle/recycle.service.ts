import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

export interface RecycleRecord {
    id?: string; // server generates; optional on add
    type: 'set' | 'directory';
    originalPath: string;
    deletedFromPath?: string | null;
    files: string[];
    deletedDate?: Date | string; // we’ll normalize to ISO on send; Date on read
}

@Injectable({
    providedIn: 'root'
})
export class RecycleService {
    private readonly baseUrl = 'http://localhost:3000/api';

    private records: RecycleRecord[] = [];

    // these two are still used for local file moves on "delete permanently"
    private storagePath: string = '';
    private deleteFolderPath: string = '';

    constructor(private http: HttpClient) { }

    /** Optional: preserve your existing path setup for local file operations */
    setPaths(storageDir: string, deleteDir: string): void {
        storageDir = (storageDir || '').trim();
        deleteDir = (deleteDir || '').trim();
        if (!storageDir || !deleteDir) return;

        this.storagePath = path.join(storageDir, 'data', 'recycle-bin.json');
        this.deleteFolderPath = path.join(deleteDir, 'delete');
    }

    /** Server-backed load. Populates in-memory cache. */
    async loadRecords(): Promise<void> {
        const res: any = await firstValueFrom(
            this.http.get(`${this.baseUrl}/get-recyclelist`)
        );

        const rows: any[] = res?.payload?.payload ?? [];
        this.records = rows.map(r => ({
            id: r.id,
            type: r.type as 'set' | 'directory',
            originalPath: r.originalPath,
            deletedFromPath: r.deletedFromPath ?? null,
            files: Array.isArray(r.files) ? r.files : [],
            deletedDate: r.deletedDate ? new Date(r.deletedDate) : undefined
        }));
    }

    /** Read-only getters (same as before) */
    getRecords(): RecycleRecord[] {
        return this.records;
    }
    getRecordsByType(type: 'set' | 'directory'): RecycleRecord[] {
        return this.records.filter(r => r.type === type);
    }
    getDeleteFolderPath(): string {
        return this.deleteFolderPath;
    }

    /** Add via API; updates local cache with server copy (including generated id). */
    async addRecord(record: RecycleRecord): Promise<void> {
        const body = {
            type: record.type,
            originalPath: record.originalPath,
            deletedFromPath: record.deletedFromPath ?? null,
            // send ISO; backend will default if missing
            deletedDate: record.deletedDate
                ? (record.deletedDate instanceof Date
                    ? record.deletedDate.toISOString()
                    : record.deletedDate)
                : undefined,
            files: record.files ?? []
        };

        const res: any = await firstValueFrom(
            this.http.post(`${this.baseUrl}/add-recycle-record`, body)
        );

        const saved = res?.payload?.payload ?? null;
        if (saved) {
            // push/replace in cache
            const idx = this.records.findIndex(r => r.id === saved.id);
            const normalized: RecycleRecord = {
                id: saved.id,
                type: (saved.type || 'set') as 'set' | 'directory',
                originalPath: saved.originalPath,
                deletedFromPath: saved.deletedFromPath ?? null,
                files: Array.isArray(saved.files) ? saved.files : [],
                deletedDate: saved.deletedDate ? new Date(saved.deletedDate) : undefined
            };
            if (idx >= 0) this.records[idx] = normalized;
            else this.records.push(normalized);
        }
    }

    /** Remove a single record (used by Restore + Delete Permanently). */
    async removeRecordFromServer(id: string): Promise<boolean> {
        try {
            const res: any = await firstValueFrom(
                this.http.post(`${this.baseUrl}/delete-recycle-record`, { id })
            );
            const ok = !!res?.payload?.payload?.deleted;
            if (ok) this.records = this.records.filter(r => r.id !== id);
            return ok;
        } catch {
            return false;
        }
    }

    /** Restore = just drop the record from DB (no local FS work). */
    async restoreRecord(recordId: string): Promise<void> {
        await this.removeRecordFromServer(recordId);
    }

    /** Restore a list = drop any record that references one of these files. */
    async restoreFiles(filePaths: string[]): Promise<void> {
        const set = new Set(filePaths || []);
        const toRemove = this.records
            .filter(r => (r.files || []).some(f => set.has(f)))
            .map(r => r.id!)
            .filter(Boolean);

        for (const id of toRemove) {
            await this.removeRecordFromServer(id);
        }
    }

    /**
     * Delete permanently:
     * - Move files to your configured "delete" folder (local action)
     * - Remove the recycle record from DB
     */
    async deletePermanently(recordId: string): Promise<void> {
        const rec = this.records.find(r => r.id === recordId);
        if (!rec) return;

        // Local FS move (your previous logic)
        for (const filePath of rec.files || []) {
            try {
                if (fs.existsSync(filePath)) {
                    const fileName = path.basename(filePath);
                    const targetPath = path.join(this.deleteFolderPath, fileName);
                    try {
                        fs.renameSync(filePath, targetPath);
                    } catch (err) {
                        // Fallback: copy + unlink
                        fs.copyFileSync(filePath, targetPath);
                        fs.unlinkSync(filePath);
                    }
                }
            } catch {
                // ignore individual failures; keep going
            }
        }

        await this.removeRecordFromServer(recordId);
    }

    /** Maintain your previous flag for preferences UI */
    public get arePathsSet(): boolean {
        return this.storagePath.trim() !== '' && this.deleteFolderPath.trim() !== '';
    }
}
