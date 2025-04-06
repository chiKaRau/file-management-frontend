import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VirtualModelModalComponent } from './virtual-model-modal.component';

describe('VirtualModelModalComponent', () => {
  let component: VirtualModelModalComponent;
  let fixture: ComponentFixture<VirtualModelModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualModelModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VirtualModelModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
