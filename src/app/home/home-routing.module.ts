import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home.component';
import { DATA_SOURCE } from '../shared/data-sources/DATA_SOURCE';
import { FsDataSource } from '../shared/data-sources/fs-data-source.service';

const routes: Routes = [
  {
    path: 'home',
    component: HomeComponent,
    providers: [{ provide: DATA_SOURCE, useClass: FsDataSource }]
  }
];

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
