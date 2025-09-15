import { Component, HostListener, OnInit } from '@angular/core';
import { RecycleRecord } from './model/recycle-record.model';
import { RecycleService } from './recycle.service';
import { DirectoryItem } from '../home/components/file-list/model/directory-item.model';
import * as fs from 'fs';
import * as path from 'path';
import { shell } from 'electron';
import { Router } from '@angular/router';
import { ExplorerStateService } from '../home/services/explorer-state.service';
import { NavigationService } from '../home/services/navigation.service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-recycle',
  templateUrl: './recycle.component.html',
  styleUrls: ['./recycle.component.scss']
})
export class RecycleComponent implements OnInit {
  setRecords: RecycleRecord[] = [];
  directoryRecords: RecycleRecord[] = [];
  items: DirectoryItem[] = [];
  showContextMenu = false;
  menuX = 0;
  menuY = 0;
  selectedRecord!: RecycleRecord;
  isBulkDeleting = false;

  constructor(private recycleService: RecycleService, private router: Router,
    private explorerState: ExplorerStateService,
    private navigationService: NavigationService,
    private http: HttpClient) { }

  ngOnInit(): void {
    this.loadRecords();
  }

  async loadRecords(): Promise<void> {
    await this.recycleService.loadRecords();
    this.setRecords = this.recycleService.getRecordsByType('set');
    this.directoryRecords = this.recycleService.getRecordsByType('directory');
    this.buildItems();
  }


  // ⬇ helper: pull ids/baseModel from a civitai-style filename
  private parseFromName(filePath: string) {
    const base = path.basename(filePath); // e.g. 123_456_SDXL_myModel.preview.png
    const m = base.match(/^(\d+)_(\d+)_([^_]+)_/);
    if (!m) return null;
    const [, modelNumber, versionNumber, baseModel] = m;
    return { modelNumber, versionNumber, baseModel };
  }

  private getTotalSize(files: string[]): number {
    let total = 0;
    for (const p of files) {
      try {
        if (fs.existsSync(p)) {
          const s = fs.statSync(p);
          if (s.isFile()) total += s.size;
        }
      } catch { /* ignore missing/busy files */ }
    }
    return total; // bytes
  }

  private buildItems(): void {
    const items: DirectoryItem[] = [];

    // Directories (you can compute folder size recursively if you want, but optional)
    for (const rec of this.directoryRecords) {
      items.push({
        name: this.getFileName(rec.originalPath),
        path: rec.originalPath,
        isFile: false,
        isDirectory: true,
        isDeleted: true,
        deletedDate: rec.deletedDate,
        deletedFromPath: path.dirname(rec.originalPath), // ← fix spelling
        recycleRecordId: rec.id
      } as DirectoryItem);
    }

    // Sets → show preview + fill scanData + size
    for (const rec of this.setRecords) {
      const preview = rec.files.find(f => f.toLowerCase().endsWith('.preview.png')) || rec.files[0];
      const parsed = this.parseFromName(preview);
      const totalSize = this.getTotalSize(rec.files);

      items.push({
        name: this.getFileName(preview),
        path: preview,
        isFile: true,
        isDirectory: false,
        isDeleted: true,
        civitaiGroup: rec.files,
        deletedDate: rec.deletedDate,
        deletedFromPath: path.dirname(rec.originalPath),
        recycleRecordId: rec.id,

        // ⬇ these make your badges show up
        size: totalSize,                         // bytes → shown via formatBytes(...)
        scanData: parsed
          ? {                                     // minimal set used by your template
            modelNumber: parsed.modelNumber,
            versionNumber: parsed.versionNumber,
            baseModel: parsed.baseModel
          }
          : {}
      } as DirectoryItem);
    }

    this.items = items;
  }

  onFileCardRightClick(e: { file: DirectoryItem; event: MouseEvent }): void {
    e.event.preventDefault();
    const id = e.file.recycleRecordId;
    const rec =
      this.setRecords.find(r => r.id === id) ||
      this.directoryRecords.find(r => r.id === id);
    if (!rec) return;

    this.selectedRecord = rec;
    this.menuX = e.event.clientX;
    this.menuY = e.event.clientY;
    this.showContextMenu = true;
  }

  async restoreRecord(): Promise<void> {
    const id = this.selectedRecord?.id;
    if (!id) {
      console.warn('No record id to restore');
      return;
    }
    await this.recycleService.restoreRecord(id); // ⬅️ wait for server
    await this.loadRecords();                    // ⬅️ repopulate list
    this.showContextMenu = false;
  }


  async deleteRecordPermanently(): Promise<void> {
    const rec = this.selectedRecord;
    if (!rec) return;

    const doLocalDelete = async () => {
      if (rec.id) {
        await this.recycleService.deletePermanently(rec.id); // ⬅️ await local move + server delete
      } else {
        console.warn('Record has no id; skipping local delete');
      }
      await this.loadRecords();
      this.showContextMenu = false;
    };

    if (rec.type === 'set') {
      const fileForParsing =
        rec.files.find(f => f.toLowerCase().endsWith('.preview.png')) || rec.files[0];

      const parsed = this.parseFromName(fileForParsing);
      if (parsed?.modelNumber && parsed?.versionNumber) {
        const body = {
          model_number: parsed.modelNumber,
          version_number: parsed.versionNumber
        };
        try {
          await lastValueFrom(this.http.post('http://localhost:3000/api/delete-record-by-model-version', body));
        } catch (err) {
          console.error('Delete record API failed:', err);
          // continue with local deletion to keep UI consistent
        }
        await doLocalDelete();
        return;
      } else {
        console.warn('Could not parse model/version from filename; skipping API call.');
      }
    }

    // directories or unparsable sets
    await doLocalDelete();
  }



  async deleteAllPermanently(): Promise<void> {
    if (this.isBulkDeleting) return;
    if (!this.setRecords.length && !this.directoryRecords.length) return;

    const ok = confirm('Delete ALL recycled items permanently? This cannot be undone.');
    if (!ok) return;

    this.isBulkDeleting = true;
    try {
      const apiCalls: Promise<any>[] = [];
      for (const rec of this.setRecords) {
        const fileForParsing =
          rec.files.find(f => f.toLowerCase().endsWith('.preview.png')) || rec.files[0];
        const parsed = this.parseFromName(fileForParsing);

        if (parsed?.modelNumber && parsed?.versionNumber) {
          const body = {
            model_number: parsed.modelNumber,
            version_number: parsed.versionNumber
          };
          apiCalls.push(
            lastValueFrom(this.http.post('http://localhost:3000/api/delete-record-by-model-version', body))
              .catch(err => {
                console.error('Delete API failed for', body, err);
              })
          );
        } else {
          console.warn('Skipping API call; cannot parse model/version from', fileForParsing);
        }
      }

      await Promise.allSettled(apiCalls);

      const all = [...this.setRecords, ...this.directoryRecords];
      for (const rec of all) {
        if (rec.id) {
          await this.recycleService.deletePermanently(rec.id); // ⬅️ await
        } else {
          console.warn('Record has no id; skipping local delete', rec);
        }
      }
      await this.loadRecords();

    } finally {
      this.isBulkDeleting = false;
    }
  }


  getFileName(path: string): string {
    // Split by both backslash and forward slash to support different OS paths
    return path.split(/[/\\]/).pop() || path;
  }

  getFileNameWithoutExtension(path: string): string {
    const fileName = this.getFileName(path);
    return fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showContextMenu = false;
  }

  onRecordRightClick(event: MouseEvent, record: RecycleRecord): void {
    event.preventDefault();
    this.selectedRecord = record;
    this.menuX = event.clientX;
    this.menuY = event.clientY;
    this.showContextMenu = true;
  }

  openContainingFolder(): void {
    if (!this.selectedRecord) return;
    const folder = path.dirname(this.selectedRecord.originalPath);

    // set the target folder into shared state + history
    this.explorerState.selectedDirectory = folder;
    this.navigationService.navigateTo(folder);

    // navigate to Home; AppComponent's (activate) will call Home.onRefresh()
    this.router.navigate(['/home']);

    this.showContextMenu = false;
  }

}
