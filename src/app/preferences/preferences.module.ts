import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PreferencesRoutingModule } from './preferences-routing.module';
import { PreferencesComponent } from './preferences/preferences.component';

@NgModule({
  declarations: [PreferencesComponent],
  imports: [
    CommonModule,
    FormsModule,
    PreferencesRoutingModule
  ]
})
export class PreferencesModule { }
