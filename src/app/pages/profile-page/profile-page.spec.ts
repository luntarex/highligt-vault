import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ProfilePage } from './profile-page';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Trigger initial data binding
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the user profile when data is available', () => {
    fixture.detectChanges();
    const username = fixture.debugElement.query(By.css('.username'));
    expect(username).toBeTruthy();
    expect(username.nativeElement.textContent).toContain(component.user?.username);
  });

  it('should render the correct number of favorite clips', () => {
    fixture.detectChanges();
    const cards = fixture.debugElement.queryAll(By.css('.favorites-card'));
    expect(cards.length).toBe(component.favoriteClips.length);
  });

  it('should render the title of the first favorite clip', () => {
    fixture.detectChanges();
    const firstCardTitle = fixture.debugElement.query(By.css('.favorites-card h3')).nativeElement;
    expect(firstCardTitle.textContent).toContain(component.favoriteClips[0].title);
  });
});
