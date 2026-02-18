import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomUpload } from './custom-upload';

describe('CustomUpload', () => {
  let component: CustomUpload;
  let fixture: ComponentFixture<CustomUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomUpload]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomUpload);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
