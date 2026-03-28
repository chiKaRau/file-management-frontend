import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmartImageComponent } from './smart-image.component';

describe('SmartImageComponent', () => {
  let component: SmartImageComponent;
  let fixture: ComponentFixture<SmartImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmartImageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SmartImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
