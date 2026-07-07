import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Application shell — sidebar + top bar hosting <router-outlet>.
 * Ported (structure only) from the design prototype's Layout.tsx.
 * Full nav tree, permissions, and language toggle still need porting — see /docs/HANDOFF.md.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    LucideAngularModule
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent {
  isCollapsed = false;
}
