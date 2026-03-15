import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DATA_SOURCE } from '../shared/data-sources/DATA_SOURCE';
import { HomeComponent } from '../home/home.component';
import { FsDataSource } from '../shared/data-sources/fs-data-source.service';


const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        data: { updateMode: true },
        providers: [{ provide: DATA_SOURCE, useClass: FsDataSource }]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class UpdateRoutingModule { }