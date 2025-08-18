import { Component, HostListener, OnInit } from '@angular/core';
import { RecycleRecord } from './model/recycle-record.model';
import { RecycleService } from './recycle.service';
import { DirectoryItem } from '../home/components/file-list/model/directory-item.model';

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

  constructor(private recycleService: RecycleService) { }

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

  private buildItems(): void {
    const items: DirectoryItem[] = [];

    // Directories as folder cards
    for (const rec of this.directoryRecords) {
      items.push({
        name: this.getFileName(rec.originalPath),
        path: rec.originalPath,
        isFile: false,
        isDirectory: true,
        isDeleted: true,
        deletedDate: rec.deletedDate,
        recycleRecordId: rec.id
      });
    }

    // Sets as image cards (use preview if present)
    for (const rec of this.setRecords) {
      const preview = rec.files.find(f => f.toLowerCase().endsWith('.preview.png')) || rec.files[0];
      items.push({
        name: this.getFileName(preview),
        path: preview,
        isFile: true,
        isDirectory: false,
        isDeleted: true,
        civitaiGroup: rec.files,
        deletedDate: rec.deletedDate,
        recycleRecordId: rec.id
      });
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

}
