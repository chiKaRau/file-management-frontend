export interface DirectoryItem {
    name: string;
    path: string;
    isFile: boolean;
    isDirectory: boolean;
    isDeleted?: boolean; // <-- New property
    size?: number;
    civitaiGroup?: string[];
    scanData?: any;  // Holds extra API data

    deletedDate?: string | Date;
    deletedFromPath?: string;
    recycleRecordId?: string;

    createdAt?: Date | string;
    modifiedAt?: Date | string;

    drive?: string;          // optional (virtual)
    imageUrl?: string;       // optional (virtual)

    childCount?: number;   // immediate children (files+dirs)
    isEmpty?: boolean;     // convenience flag (childCount === 0)
}