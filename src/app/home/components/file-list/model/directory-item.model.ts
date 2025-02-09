export interface DirectoryItem {
    name: string;
    path: string;
    isFile: boolean;
    isDirectory: boolean;
    isDeleted?: boolean; // <-- New property
    civitaiGroup?: string[];
}