import { Routes } from '@angular/router';
import { AdminGuard } from './core/guards/admin.guard';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/feed/feed').then(m => m.Feed),
    canActivate: [AuthGuard]
  },
  {
    path: 'add-post/:id',
    loadComponent: () => import('./features/add-post/add-post').then(m => m.AddPostPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'library',
    loadComponent: () => import('./features/library/library').then(m => m.Library),
    canActivate: [AuthGuard]
  },
  {
    path: 'playlist/:id',
    loadComponent: () => import('./features/playlist-view/playlist-view').then(m => m.PlaylistView),
    canActivate: [AuthGuard]
  },
  {
    path: 'welcome',
    loadComponent: () => import('./features/welcome/welcome').then(m => m.Welcome)
  },
  {
    path: 'favorites',
    loadComponent: () => import('./features/favorites/favorites').then(m => m.Favorites),
    canActivate: [AuthGuard]
  },
  {
    path: 'clip-editor/:id',
    loadComponent: () => import('./features/clip-editor/clip-editor').then(m => m.ClipEditor),
    canActivate: [AuthGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'complete-profile',
    loadComponent: () => import('./features/auth/complete-profile/complete-profile').then(m => m.CompleteProfile)
  },
  {
    path: 'profile/edit',
    loadComponent: () => import('./features/profile/profile-edit/profile-edit').then(m => m.ProfileEdit),
    canActivate: [AuthGuard]
  },
  {
    path: 'profile/:id',
    loadComponent: () => import('./features/profile/profile-page').then(m => m.ProfilePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile-page').then(m => m.ProfilePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'explore',
    loadComponent: () => import('./features/explore/explore').then(m => m.Explore),
    canActivate: [AuthGuard]
  },
  {
    path: 'post/:id',
    loadComponent: () => import('./features/post-detail/post-detail').then(m => m.PostDetail),
    canActivate: [AuthGuard]
  },
  {
    path: 'user-comments/:userId',
    loadComponent: () => import('./features/user-comments/user-comments').then(m => m.UserComments),
    canActivate: [AuthGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./features/users-list-page/users-list-page').then(m => m.UsersListPage),
    canActivate: [AdminGuard]
  },
  {
    path: 'moderation',
    loadComponent: () => import('./features/moderation/moderation').then(m => m.Moderation),
    canActivate: [AdminGuard]
  },
  {
    path: 'messages',
    loadComponent: () => import('./features/messages/messages').then(m => m.MessagesComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'messages/:userId',
    loadComponent: () => import('./features/messages/messages').then(m => m.MessagesComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'about-us',
    loadComponent: () => import('./features/about-us/about-us').then(m => m.AboutUs)
  }
];
