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
    recycleRecordId?: string;
}