import { Routes } from '@angular/router';
import { Library } from './features/library/library';
import { ClipEditor } from './features/clip-editor/clip-editor';
import { Register } from './features/auth/register/register';
import { Login } from './features/auth/login/login';
import { ProfilePage } from './features/profile/profile-page';
import { ProfileEdit } from './features/profile/profile-edit/profile-edit';
import { CompleteProfile } from './features/auth/complete-profile/complete-profile';
import { Welcome } from './features/welcome/welcome';
import { Explore } from './features/explore/explore';
import { UserComments } from './features/user-comments/user-comments';
import { UsersListPage } from './features/users-list-page/users-list-page';
import { Favorites } from './features/favorites/favorites';
import { AdminGuard } from './core/guards/admin.guard';
import { AuthGuard } from './core/guards/auth.guard';
import { PlaylistView } from './features/playlist-view/playlist-view';
import { MessagesComponent } from './features/messages/messages';
import { AboutUs } from './features/about-us/about-us';
import { Feed } from './features/feed/feed';
import { AddPostPage } from './features/add-post/add-post';
import { Moderation } from './features/moderation/moderation';

export const routes: Routes = [
  { path: '', component: Feed, canActivate: [AuthGuard] },
  { path: 'add-post/:id', component: AddPostPage, canActivate: [AuthGuard] },
  { path: 'library', component: Library, canActivate: [AuthGuard] },
  { path: 'playlist/:id', component: PlaylistView, canActivate: [AuthGuard] },
  { path: 'welcome', component: Welcome },
  { path: 'favorites', component: Favorites, canActivate: [AuthGuard] },
  { path: 'clip-editor/:id', component: ClipEditor, canActivate: [AuthGuard] },
  { path: 'register', component: Register },
  { path: 'login', component: Login },
  { path: 'complete-profile', component: CompleteProfile },
  { path : 'profile/edit', component : ProfileEdit, canActivate: [AuthGuard] },
  { path : 'profile/:id', component : ProfilePage, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfilePage, canActivate: [AuthGuard] },
  { path: 'explore', component: Explore, canActivate: [AuthGuard] },
  { path: 'user-comments/:userId', component: UserComments, canActivate: [AuthGuard] },
  { path: 'users', component: UsersListPage, canActivate: [AdminGuard] },
  { path: 'moderation', component: Moderation, canActivate: [AdminGuard] },
  { path: 'messages', component: MessagesComponent, canActivate: [AuthGuard] },
  { path: 'messages/:userId', component: MessagesComponent, canActivate: [AuthGuard] },
  { path: 'about-us', component: AboutUs }

];
