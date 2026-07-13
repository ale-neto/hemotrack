import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Toast],
  providers: [MessageService],
  template: `
    <p-toast position="top-right" [life]="4000" />
    <router-outlet />
  `,
})
export class AppComponent {}
