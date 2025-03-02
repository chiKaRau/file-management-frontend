import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZipSidebarComponent } from './zip-sidebar.component';

describe('ZipSidebarComponent', () => {
  let component: ZipSidebarComponent;
  let fixture: ComponentFixture<ZipSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZipSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ZipSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
