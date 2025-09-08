import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { FileListComponent } from './components/file-list/file-list.component';
import { ExplorerToolbarComponent } from './components/explorer-toolbar/explorer-toolbar.component';

import { HomeComponent } from './home.component';
import { SharedModule } from '../shared/shared.module';
import { FileInfoSidebarComponent } from './components/file-info-sidebar/file-info-sidebar.component';
import { UpdateSidebarComponent } from './components/update-sidebar/update-sidebar.component';
import { ModelModalComponent } from './components/model-modal/model-modal.component';
import { ZipSidebarComponent } from './components/zip-sidebar/zip-sidebar.component';
import { VirtualExplorerToolbarComponent } from '../virtual/components/virtual-explorer-toolbar/virtual-explorer-toolbar.component';

@NgModule({
  declarations: [HomeComponent, FileListComponent, ExplorerToolbarComponent,
    FileInfoSidebarComponent, UpdateSidebarComponent, ModelModalComponent, ZipSidebarComponent, VirtualExplorerToolbarComponent],
  imports: [CommonModule, SharedModule, HomeRoutingModule],
  exports: [FileListComponent, HomeComponent]
})
export class HomeModule { }
