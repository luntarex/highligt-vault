import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserComments } from './user-comments';

describe('UserComments', () => {
  let component: UserComments;
  let fixture: ComponentFixture<UserComments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserComments]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserComments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
