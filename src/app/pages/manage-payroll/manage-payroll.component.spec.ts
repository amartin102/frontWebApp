import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagePayrollComponent } from './manage-payroll.component';

describe('ManagePayrollComponent', () => {
  let component: ManagePayrollComponent;
  let fixture: ComponentFixture<ManagePayrollComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagePayrollComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagePayrollComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
