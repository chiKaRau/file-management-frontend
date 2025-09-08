// src/app/explorer/DATA_SOURCE.ts
import { InjectionToken } from '@angular/core';
import { ExplorerDataSource } from './data-source';

export const DATA_SOURCE = new InjectionToken<ExplorerDataSource>('DATA_SOURCE');
