import { Component } from '@angular/core';
import { PresentesSectionComponent } from './presentes-section';

@Component({
  selector: 'app-presentes-page',
  imports: [PresentesSectionComponent],
  template: `<app-presentes-section />`,
})
export class PresentesPageComponent {}
