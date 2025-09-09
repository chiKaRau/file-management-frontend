import { Component, OnInit } from '@angular/core';
import { ElectronService } from './core/services';
import { TranslateService } from '@ngx-translate/core';
import { APP_CONFIG } from '../environments/environment';
import { HomeRefreshService } from './home/services/home-refresh.service';
import { HomeComponent } from './home/home.component';
import { RecycleComponent } from './recycle/recycle.component';
import { ThemeService } from './home/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit { // ⬅️ implement OnInit
  constructor(
    private electronService: ElectronService,
    private translate: TranslateService,
    private homeRefreshService: HomeRefreshService,
    private theme: ThemeService, // ⬅️ inject to initialize theme on app start
  ) {
    this.translate.setDefaultLang('en');
    console.log('APP_CONFIG', APP_CONFIG);

    if (electronService.isElectron) {
      console.log(process.env);
      console.log('Run in electron');
      console.log('Electron ipcRenderer', this.electronService.ipcRenderer);
      console.log('NodeJS childProcess', this.electronService.childProcess);
    } else {
      console.log('Run in browser');
    }
  }

  ngOnInit(): void {
    // Ensure the saved/initial theme is applied to <html> immediately,
    // and keep a live subscription so flips propagate instantly.
    this.theme.theme$.subscribe(); // no-op subscription is fine
    // (ThemeService sets the html class in its own setter/initializer)
  }

  // This method is called when any routed component is activated.
  onActivate(componentRef: any) {
    if (componentRef instanceof HomeComponent) {
      console.log('HomeComponent activated, refreshing...');
      componentRef.onRefresh();
    }
    if (componentRef instanceof RecycleComponent) {
      console.log('RecycleComponent activated, refreshing...');
      componentRef.loadRecords();
    }
  }
}
