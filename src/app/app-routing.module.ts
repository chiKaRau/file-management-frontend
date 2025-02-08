import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PageNotFoundComponent } from './shared/components';

import { HomeRoutingModule } from './home/home-routing.module';
import { DetailRoutingModule } from './detail/detail-routing.module';
import { RecycleComponent } from './recycle/recycle.component';


const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  // ...
  { path: 'home', loadChildren: () => import('./home/home.module').then(m => m.HomeModule) },
  { path: 'preferences', loadChildren: () => import('./preferences/preferences.module').then(m => m.PreferencesModule) },
  { path: 'recycle', component: RecycleComponent },
  { path: '**', component: PageNotFoundComponent }
];



@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled',
      // or 'top' if you want it always to scroll to top on new route
    }),
    HomeRoutingModule,
    DetailRoutingModule
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
