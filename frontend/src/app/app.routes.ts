import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';
import { AdminComponent } from './features/admin/admin';
import { ConvidadosComponent } from './features/convidados/convidados';

import { FotosPageComponent } from './features/fotos/fotos-page';
import { HqPageComponent } from './features/hq/hq-page';
import { PresentesPageComponent } from './features/presentes/presentes-page';
import { CameraPageComponent } from './features/fotos/camera-page';
import { ConvitePageComponent } from './features/convite/convite-page';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'convite', component: ConvitePageComponent },
  { path: 'presentes', component: PresentesPageComponent },
  { path: 'fotos', component: FotosPageComponent },
  { path: 'festa/:slug/camera', component: CameraPageComponent, data: { capture: true } },
  { path: 'hq', component: HqPageComponent },
  { path: 'convidados', component: ConvidadosComponent },
  { path: 'admin', component: AdminComponent },
  { path: '**', redirectTo: '' },
];
