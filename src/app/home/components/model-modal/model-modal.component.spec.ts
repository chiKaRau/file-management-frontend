import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelModalComponent } from './model-modal.component';

describe('ModelModalComponent', () => {
  let component: ModelModalComponent;
  let fixture: ComponentFixture<ModelModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ModelModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
