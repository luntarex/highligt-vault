import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommentsModal } from './comments-modal';

describe('CommentsModal', () => {
  let component: CommentsModal;
  let fixture: ComponentFixture<CommentsModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommentsModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommentsModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
