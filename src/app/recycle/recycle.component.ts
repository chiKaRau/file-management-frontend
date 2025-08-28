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

  constructor(private recycleService: RecycleService, private router: Router,
    private explorerState: ExplorerStateService,
    private navigationService: NavigationService) { }

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    // Read the latest records from disk.
    this.recycleService.loadRecords();
    // Then update the component's arrays.
    this.setRecords = this.recycleService.getRecordsByType('set');
    this.directoryRecords = this.recycleService.getRecordsByType('directory');
    console.log('Recycle records refreshed:', this.setRecords, this.directoryRecords);
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
        eletedFromPath: path.dirname(rec.originalPath),
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

  restoreRecord(): void {
    this.recycleService.restoreRecord(this.selectedRecord.id);
    this.loadRecords();
    this.showContextMenu = false;
  }

  deleteRecordPermanently(): void {
    this.recycleService.deletePermanently(this.selectedRecord.id);
    this.loadRecords();
    this.showContextMenu = false;
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
