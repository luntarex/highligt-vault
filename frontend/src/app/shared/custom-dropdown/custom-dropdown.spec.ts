import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomDropdown } from './custom-dropdown';

describe('CustomDropdown', () => {
  let component: CustomDropdown;
  let fixture: ComponentFixture<CustomDropdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomDropdown]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomDropdown);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
