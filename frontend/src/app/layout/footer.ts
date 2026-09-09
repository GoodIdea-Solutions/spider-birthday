import { Component } from '@angular/core';
import { WebCornerComponent } from './web-corner';

@Component({
  selector: 'app-footer',
  imports: [WebCornerComponent],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {}
