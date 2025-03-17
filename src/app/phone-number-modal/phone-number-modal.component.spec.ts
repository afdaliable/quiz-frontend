import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhoneNumberModalComponent } from './phone-number-modal.component';

describe('PhoneNumberModalComponent', () => {
  let component: PhoneNumberModalComponent;
  let fixture: ComponentFixture<PhoneNumberModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhoneNumberModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhoneNumberModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
