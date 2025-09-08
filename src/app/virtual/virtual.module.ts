import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel support
import { VirtualRoutingModule } from './virtual-routing.module';
import { HomeModule } from '../home/home.module';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        HomeModule,
        VirtualRoutingModule
    ]
})
export class VirtualModule { }
