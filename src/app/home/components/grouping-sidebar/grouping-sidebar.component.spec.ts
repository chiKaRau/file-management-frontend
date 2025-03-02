import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupingSidebarComponent } from './grouping-sidebar.component';

describe('GroupingSidebarComponent', () => {
  let component: GroupingSidebarComponent;
  let fixture: ComponentFixture<GroupingSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupingSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GroupingSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
