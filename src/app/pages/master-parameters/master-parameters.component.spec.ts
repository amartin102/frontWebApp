import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterParametersComponent } from './master-parameters.component';

describe('MasterParametersComponent', () => {
  let component: MasterParametersComponent;
  let fixture: ComponentFixture<MasterParametersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterParametersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterParametersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
