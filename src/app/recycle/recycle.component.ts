import { Component, HostListener, OnInit } from '@angular/core';
import { RecycleRecord } from './model/recycle-record.model';
import { RecycleService } from './recycle.service';

@Component({
  selector: 'app-recycle',
  templateUrl: './recycle.component.html',
  styleUrls: ['./recycle.component.scss']
})
export class RecycleComponent implements OnInit {
  setRecords: RecycleRecord[] = [];
  directoryRecords: RecycleRecord[] = [];
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
  }

  onRecordRightClick(event: MouseEvent, record: RecycleRecord): void {
    event.preventDefault();
    this.selectedRecord = record;
    this.menuX = event.clientX;
    this.menuY = event.clientY;
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
}
