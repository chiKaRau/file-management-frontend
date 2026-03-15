import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomeModule } from '../home/home.module';
import { UpdateRoutingModule } from './update-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HomeModule,
    UpdateRoutingModule
  ]
})
export class UpdateModule { }