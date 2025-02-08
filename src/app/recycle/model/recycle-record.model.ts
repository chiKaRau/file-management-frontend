// src/app/recycle/model/recycle-record.model.ts
export interface RecycleRecord {
    id: string;            // A unique identifier (e.g. generated via uuid)
    type: 'set' | 'directory'; // Determines which section this record belongs to
    originalPath: string;  // Where the file/set/directory was originally located
    files: string[];       // List of file paths (for a set, this includes all related files)
    deletedDate: Date;     // When the deletion occurred
}
