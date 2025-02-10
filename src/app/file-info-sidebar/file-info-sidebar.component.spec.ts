import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileInfoSidebarComponent } from './file-info-sidebar.component';

describe('FileInfoSidebarComponent', () => {
  let component: FileInfoSidebarComponent;
  let fixture: ComponentFixture<FileInfoSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileInfoSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FileInfoSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
