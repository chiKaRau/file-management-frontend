import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel support
import { VirtualRoutingModule } from './virtual-routing.module';
import { VirtualComponent } from './virtual.component';
import { VirtualFileListComponent } from './components/virtual-file-list/virtual-file-list.component';
import { VirtualFileInfoSidebarComponent } from './components/virtual-file-info-sidebar/virtual-file-info-sidebar.component';
import { VirtualExplorerToolbarComponent } from './components/virtual-explorer-toolbar/virtual-explorer-toolbar.component';

@NgModule({
    declarations: [VirtualComponent, VirtualFileListComponent,
        VirtualFileInfoSidebarComponent, VirtualExplorerToolbarComponent],
    imports: [
        CommonModule,
        FormsModule,
        VirtualRoutingModule
    ]
})
export class VirtualModule { }
