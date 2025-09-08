// src/app/explorer/data-source.ts
import { Observable } from 'rxjs';
import { DirectoryItem } from '../../home/components/file-list/model/directory-item.model';

export interface ExplorerDataSource {
    /** List items for a “path”. For virtual, path is your virtual path (e.g. "\\ACG\\...") */
    list(path: string | null): Observable<{ items: DirectoryItem[], selectedDirectory: string | null }>;

    /** Optional: is this a read-only/virtual source? (to hide cut/paste/rename etc.) */
    readonly readOnly?: boolean;

    /** Optional: initial root path (for virtual), null means “no directory chosen yet” */
    readonly initialPath?: string | null;
}
