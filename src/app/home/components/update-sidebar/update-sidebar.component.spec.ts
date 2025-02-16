import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateSidebarComponent } from './update-sidebar.component';

describe('UpdateSidebarComponent', () => {
  let component: UpdateSidebarComponent;
  let fixture: ComponentFixture<UpdateSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
