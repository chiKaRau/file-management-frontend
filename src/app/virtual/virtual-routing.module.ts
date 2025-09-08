import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from '../home/home.component';
import { VirtualDbDataSource } from '../shared/data-sources/virtual-data-source.service';
import { DATA_SOURCE } from '../shared/data-sources/DATA_SOURCE';

const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        providers: [{ provide: DATA_SOURCE, useClass: VirtualDbDataSource }]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class VirtualRoutingModule { }
