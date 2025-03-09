import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel support
import { VirtualRoutingModule } from './virtual-routing.module';
import { VirtualComponent } from './virtual.component';

@NgModule({
    declarations: [VirtualComponent],
    imports: [
        CommonModule,
        FormsModule,
        VirtualRoutingModule
    ]
})
export class VirtualModule { }
