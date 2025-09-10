import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';

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
import { LazyBgDirective } from '../shared/directives/lazy/lazy-bg.directive';

@NgModule({
  declarations: [HomeComponent, FileListComponent, ExplorerToolbarComponent,
    FileInfoSidebarComponent, UpdateSidebarComponent, ModelModalComponent, ZipSidebarComponent, LazyBgDirective, VirtualExplorerToolbarComponent],
  imports: [CommonModule, SharedModule, HomeRoutingModule, ScrollingModule],
  exports: [FileListComponent, HomeComponent]
})
export class HomeModule { }
