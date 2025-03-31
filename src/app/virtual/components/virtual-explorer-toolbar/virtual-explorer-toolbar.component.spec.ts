import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VirtualExplorerToolbarComponent } from './virtual-explorer-toolbar.component';

describe('VirtualExplorerToolbarComponent', () => {
  let component: VirtualExplorerToolbarComponent;
  let fixture: ComponentFixture<VirtualExplorerToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualExplorerToolbarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VirtualExplorerToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
