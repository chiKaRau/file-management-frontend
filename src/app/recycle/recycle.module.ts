// src/app/recycle/recycle.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { RecycleComponent } from './recycle.component';
import { HomeModule } from '../home/home.module';   // gives us <app-file-list>

const routes: Routes = [
    { path: '', component: RecycleComponent }
];

@NgModule({
    declarations: [
        RecycleComponent                 // <-- only your own component here
    ],
    imports: [
        CommonModule,
        HomeModule,                      // <-- import the module that EXPORTS FileListComponent
        RouterModule.forChild(routes), // or your existing RecycleRoutingModule
        HomeModule
    ]
})
export class RecycleModule { }
