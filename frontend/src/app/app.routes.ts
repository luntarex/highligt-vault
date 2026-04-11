import { Routes } from '@angular/router';
import { Library } from './features/library/library';
import { ClipEditor } from './features/clip-editor/clip-editor';
import { Register } from './features/auth/register/register';
import { Login } from './features/auth/login/login';
import { ProfilePage } from './features/profile/profile-page';
import { Explore } from './features/explore/explore';
import { UserComments } from './features/user-comments/user-comments';

export const routes: Routes = [
  { path: '', component: Library },
  { path: 'clip-editor/:id', component: ClipEditor },
  { path: 'register', component: Register },
  { path: 'login', component: Login },
  { path : 'profile/:id', component : ProfilePage},
  { path: 'profile', component: ProfilePage },
  { path: 'explore', component: Explore },
  { path: 'user-comments/:userId', component: UserComments }
];
