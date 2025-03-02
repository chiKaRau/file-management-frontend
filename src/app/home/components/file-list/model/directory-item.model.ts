export interface DirectoryItem {
    name: string;
    path: string;
    isFile: boolean;
    isDirectory: boolean;
    isDeleted?: boolean; // <-- New property
    civitaiGroup?: string[];
    scanData?: any;  // Holds extra API data
}