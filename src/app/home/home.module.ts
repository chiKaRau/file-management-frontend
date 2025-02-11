import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { FileListComponent } from './components/file-list/file-list.component';
import { ExplorerToolbarComponent } from './components/explorer-toolbar/explorer-toolbar.component';

import { HomeComponent } from './home.component';
import { SharedModule } from '../shared/shared.module';
import { FileInfoSidebarComponent } from './components/file-info-sidebar/file-info-sidebar.component';

@NgModule({
  declarations: [HomeComponent, FileListComponent, ExplorerToolbarComponent, FileInfoSidebarComponent],
  imports: [CommonModule, SharedModule, HomeRoutingModule]
})
export class HomeModule { }
