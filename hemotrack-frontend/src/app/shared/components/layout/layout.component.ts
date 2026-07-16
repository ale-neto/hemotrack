import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, AvatarModule, TooltipModule],
  template: `
    <div class="app-shell">
      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="collapsed()">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            @if (!collapsed()) {
              <span class="logo-text">HemoTrack</span>
            }
          </div>
          <button class="collapse-btn" (click)="collapsed.set(!collapsed())" [pTooltip]="collapsed() ? 'Expandir' : 'Recolher'" tooltipPosition="right">
            <i class="pi" [class.pi-chevron-left]="!collapsed()" [class.pi-chevron-right]="collapsed()"></i>
          </button>
        </div>

        <nav class="sidebar-nav">
          @for (item of navItems; track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              class="nav-item"
              [pTooltip]="collapsed() ? item.label : ''"
              tooltipPosition="right"
            >
              <i class="pi {{ item.icon }} nav-icon"></i>
              @if (!collapsed()) {
                <span class="nav-label">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-info" [class.centered]="collapsed()">
            <p-avatar
              [label]="userInitials()"
              styleClass="user-avatar"
              shape="circle"
            />
            @if (!collapsed()) {
              <div class="user-details">
                <span class="user-name">{{ auth.user()?.name }}</span>
                <span class="user-email">{{ auth.user()?.email }}</span>
              </div>
            }
          </div>
          <button
            class="logout-btn"
            (click)="auth.logout()"
            [pTooltip]="'Sair'"
            tooltipPosition="right"
          >
            <i class="pi pi-sign-out"></i>
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--ht-bg);
}
    /* ── Sidebar ──────────────────────────────────────── */
    .sidebar {
      width: var(--sidebar-w);
      min-height: 100vh;
      background: var(--ht-white);
      border-right: 1px solid var(--ht-border);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      transition: width 200ms cubic-bezier(.4,0,.2,1);
      flex-shrink: 0;
      overflow: hidden;
    }

    .sidebar.collapsed { width: 68px; }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1rem;
      border-bottom: 1px solid var(--ht-border);
      min-height: 64px;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: .6rem;
      overflow: hidden;
      white-space: nowrap;
    }

    .logo-icon { font-size: 1.4rem; flex-shrink: 0; }
    .logo-text { font-size: 1.1rem; font-weight: 700; color: var(--ht-text); letter-spacing: -.03em; }

    .collapse-btn {
      background: none;
      border: none;
      color: var(--ht-text-3);
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all var(--transition);
      flex-shrink: 0;
      &:hover { background: var(--ht-off-white); color: var(--ht-text); }
    }

    /* ── Nav ──────────────────────────────────────────── */
    .sidebar-nav {
      flex: 1;
      padding: .75rem .75rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .65rem .75rem;
      border-radius: var(--radius-sm);
      color: var(--ht-text-2);
      font-size: .875rem;
      font-weight: 500;
      transition: all var(--transition);
      white-space: nowrap;
      overflow: hidden;
      text-decoration: none;

      &:hover {
        background: var(--ht-off-white);
        color: var(--ht-text);
      }

      &.active {
        background: var(--ht-red-muted);
        color: var(--ht-red);
        font-weight: 600;

        .nav-icon { color: var(--ht-red); }
      }
    }

    .nav-icon { font-size: 1rem; flex-shrink: 0; width: 20px; text-align: center; }
    .nav-label { flex: 1; }

    /* ── Footer ───────────────────────────────────────── */
    .sidebar-footer {
      border-top: 1px solid var(--ht-border);
      padding: .75rem;
      display: flex;
      align-items: center;
      gap: .5rem;
    }

    .user-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: .6rem;
      overflow: hidden;
      min-width: 0;
      &.centered { justify-content: center; }
    }

    ::ng-deep .user-avatar {
      background: var(--ht-red-muted) !important;
      color: var(--ht-red) !important;
      font-weight: 700 !important;
      font-size: .8rem !important;
      width: 32px !important;
      height: 32px !important;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .user-name {
      font-size: .8rem;
      font-weight: 600;
      color: var(--ht-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      font-size: .7rem;
      color: var(--ht-text-3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .logout-btn {
      background: none;
      border: none;
      color: var(--ht-text-3);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      flex-shrink: 0;
      transition: all var(--transition);
      &:hover { background: var(--ht-high-light); color: var(--ht-high); }
      i { font-size: .9rem; }
    }

    /* ── Main ─────────────────────────────────────────── */
.main-content {
  flex: 1;
  min-width: 0;
  padding: 2rem;
  max-height: 100vh;
  overflow-y: auto;
}

    @media (max-width: 768px) {
      .sidebar { width: 68px; }
      .logo-text, .nav-label, .user-details { display: none; }
    }
  `],
})
export class LayoutComponent {
  auth = inject(AuthService);
  collapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/dashboard' },
    { label: 'Exames', icon: 'pi-file-edit', route: '/exams' },
    { label: 'Relatórios', icon: 'pi-chart-line', route: '/reports' },
    { label: 'Perfis', icon: 'pi-users', route: '/profiles' },
    { label: 'Configurações', icon: 'pi-cog', route: '/settings' },
  ];

  userInitials(): string {
    const name = this.auth.user()?.name || '';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
