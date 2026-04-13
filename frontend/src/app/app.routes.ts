import { Routes } from '@angular/router';
import { Library } from './features/library/library';
import { ClipEditor } from './features/clip-editor/clip-editor';
import { Register } from './features/auth/register/register';
import { Login } from './features/auth/login/login';
import { ProfilePage } from './features/profile/profile-page';
import { CompleteProfile } from './features/auth/complete-profile/complete-profile';
import { Welcome } from './features/welcome/welcome';
import { Explore } from './features/explore/explore';
import { UserComments } from './features/user-comments/user-comments';
import { UsersListPage } from './features/users-list-page/users-list-page';
import { Trash } from './features/trash/trash';
import { AdminGuard } from './core/guards/admin.guard';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: Library, canActivate: [AuthGuard] },
  { path: 'welcome', component: Welcome },
  { path: 'trash', component: Trash, canActivate: [AuthGuard] },
  { path: 'clip-editor/:id', component: ClipEditor, canActivate: [AuthGuard] },
  { path: 'register', component: Register },
  { path: 'login', component: Login },
  { path: 'complete-profile', component: CompleteProfile },
  { path : 'profile/:id', component : ProfilePage, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfilePage, canActivate: [AuthGuard] },
  { path: 'explore', component: Explore, canActivate: [AuthGuard] },
  { path: 'user-comments/:userId', component: UserComments, canActivate: [AuthGuard] },
  { path: 'users', component: UsersListPage, canActivate: [AdminGuard] }
];
