import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VirtualComponent } from './virtual.component';

const routes: Routes = [
    { path: '', component: VirtualComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class VirtualRoutingModule { }
