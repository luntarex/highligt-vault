import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClipCard } from './clip-card';

describe('ClipCard', () => {
  let component: ClipCard;
  let fixture: ComponentFixture<ClipCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClipCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClipCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
