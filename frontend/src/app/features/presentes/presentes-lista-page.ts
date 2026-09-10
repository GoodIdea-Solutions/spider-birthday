import { Component } from '@angular/core';
import { PresentesListaComponent } from './presentes-lista';

@Component({
  selector: 'app-presentes-lista-page',
  imports: [PresentesListaComponent],
  template: `<app-presentes-lista />`,
})
export class PresentesListaPageComponent {}
