import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VirtualFileInfoSidebarComponent } from './virtual-file-info-sidebar.component';

describe('VirtualFileInfoSidebarComponent', () => {
  let component: VirtualFileInfoSidebarComponent;
  let fixture: ComponentFixture<VirtualFileInfoSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualFileInfoSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VirtualFileInfoSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
