import { Routes } from '@angular/router';
import { Library } from './components/library/library';
import { ClipEditor } from './components/clip-editor/clip-editor';
import { Register } from './pages/auth/register/register';
import { Login } from './pages/auth/login/login';
export const routes: Routes = [
  { path: '', component: Library },
  { path: 'clip-editor/:id', component: ClipEditor },
  { path : 'register',component : Register},
  { path : 'login',component : Login}
];
