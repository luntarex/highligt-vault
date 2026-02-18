import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClipEditor } from './clip-editor';

describe('ClipEditor', () => {
  let component: ClipEditor;
  let fixture: ComponentFixture<ClipEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClipEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClipEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
