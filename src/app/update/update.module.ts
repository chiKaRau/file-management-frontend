import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel support
import { UpdateRoutingModule } from './update-routing.module';
import { UpdateComponent } from './update.component';

@NgModule({
    declarations: [UpdateComponent],
    imports: [
        CommonModule,
        FormsModule,
        UpdateRoutingModule
    ]
})
export class UpdateModule { }
