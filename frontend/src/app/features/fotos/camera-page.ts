import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PartyConfigService } from '../../core/services/party-config.service';
import { CameraCapturaComponent } from './camera-captura';

@Component({
  selector: 'app-camera-page',
  imports: [CameraCapturaComponent],
  templateUrl: './camera-page.html',
  styleUrl: './camera-page.scss',
})
export class CameraPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly party = inject(PartyConfigService);

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const check = () => {
      if (slug !== this.party.slug()) {
        void this.router.navigateByUrl('/');
      }
    };
    if (this.party.config()) {
      check();
    } else {
      this.party.load().subscribe(() => check());
    }
  }
}
