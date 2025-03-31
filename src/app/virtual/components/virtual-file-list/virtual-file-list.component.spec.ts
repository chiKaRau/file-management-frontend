import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VirtualFileListComponent } from './virtual-file-list.component';

describe('VirtualFileListComponent', () => {
  let component: VirtualFileListComponent;
  let fixture: ComponentFixture<VirtualFileListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualFileListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VirtualFileListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
