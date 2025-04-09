import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VirtualGroupingSidebarComponent } from './virtual-grouping-sidebar.component';

describe('VirtualGroupingSidebarComponent', () => {
  let component: VirtualGroupingSidebarComponent;
  let fixture: ComponentFixture<VirtualGroupingSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualGroupingSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VirtualGroupingSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
