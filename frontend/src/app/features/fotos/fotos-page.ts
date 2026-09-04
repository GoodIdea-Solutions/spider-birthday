import { Component } from '@angular/core';
import { FotosSectionComponent } from './fotos-section';

@Component({
  selector: 'app-fotos-page',
  imports: [FotosSectionComponent],
  template: `<app-fotos-section />`,
})
export class FotosPageComponent {}
