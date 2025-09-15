export interface RecycleRecord {
    id?: string;                           // server-generated
    type: 'set' | 'directory';
    originalPath: string;
    deletedFromPath?: string | null;       // <-- add this
    files: string[];
    deletedDate?: Date | string;           // optional; service will send ISO if present
}
