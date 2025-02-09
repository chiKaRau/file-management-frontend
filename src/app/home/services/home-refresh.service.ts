// src/app/home/services/home-refresh.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class HomeRefreshService {
    private refreshSubject = new Subject<void>();
    refresh$ = this.refreshSubject.asObservable();

    triggerRefresh() {
        this.refreshSubject.next();
    }
}
