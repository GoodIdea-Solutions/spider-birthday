import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';
import { AdminComponent } from './features/admin/admin';
import { ConvidadosComponent } from './features/convidados/convidados';

import { FotosPageComponent } from './features/fotos/fotos-page';
import { HqPageComponent } from './features/hq/hq-page';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'fotos', component: FotosPageComponent },
  { path: 'hq', component: HqPageComponent },
  { path: 'convidados', component: ConvidadosComponent },
  { path: 'admin', component: AdminComponent },
  { path: '**', redirectTo: '' },
];
