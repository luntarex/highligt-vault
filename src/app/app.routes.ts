import { Routes } from '@angular/router';
import { Library } from './components/library/library';
import { ClipEditor } from './components/clip-editor/clip-editor';

export const routes: Routes = [
  { path: '', component: Library },
  { path: 'clip-editor/:id', component: ClipEditor }
];
