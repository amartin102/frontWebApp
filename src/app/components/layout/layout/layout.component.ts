// components/layout/layout.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MenubarModule, SidebarModule, ButtonModule, AvatarModule],
  template: `
    <div class="layout-wrapper">
      <!-- Sidebar -->
      <div class="sidebar" [class.sidebar-collapsed]="sidebarCollapsed">
        <div class="sidebar-header">
          <h3>{{sidebarCollapsed ? 'P' : 'Parámetros'}}</h3>
        </div>
        <nav class="sidebar-nav">
          <ul>
            <li>
              <a routerLink="/layout/parameters/master" 
                 routerLinkActive="active" 
                 [class.collapsed]="sidebarCollapsed">
                <i class="pi pi-cog"></i>
                <span>Maestro Parámetros</span>
              </a>
            </li>
            <li>
              <a routerLink="/layout/parameters/values" 
                 routerLinkActive="active" 
                 [class.collapsed]="sidebarCollapsed">
                <i class="pi pi-list"></i>
                <span>Valores Parámetros</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Header -->
        <header class="header">
          <div class="header-left">
            <button pButton icon="pi pi-bars" class="p-button-text" (click)="toggleSidebar()"></button>
          </div>
          <div class="header-right">
            <p-avatar icon="pi pi-user" styleClass="mr-2"></p-avatar>
            <button pButton icon="pi pi-sign-out" label="Cerrar Sesión" class="p-button-text" (click)="logout()"></button>
          </div>
        </header>

        <!-- Page Content -->
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout-wrapper {
      display: flex;
      height: 100vh;
      background-color: #f8f9fa;
    }

    .sidebar {
      width: 250px;
      background: linear-gradient(180deg, #87CEEB 0%, #B0E0E6 100%);
      transition: width 0.3s ease;
      box-shadow: 2px 0 5px rgba(0,0,0,0.1);
    }

    .sidebar-collapsed {
      width: 60px;
    }

    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      text-align: center;
    }

    .sidebar-header h3 {
      color: white;
      margin: 0;
      font-weight: 600;
    }

    .sidebar-nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .sidebar-nav li {
      margin: 0.5rem 0;
    }

    .sidebar-nav a {
      display: flex;
      align-items: center;
      padding: 1rem 1.5rem;
      color: white;
      text-decoration: none;
      transition: all 0.3s ease;
    }

    .sidebar-nav a:hover {
      background: rgba(255,255,255,0.1);
    }

    .sidebar-nav a.active {
      background: rgba(255,255,255,0.2);
      border-right: 4px solid white;
    }

    .sidebar-nav i {
      margin-right: 1rem;
      font-size: 1.2rem;
    }

    .sidebar-collapsed .sidebar-nav span {
      display: none;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .header {
      background: white;
      padding: 1rem 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .content {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
    }
  `]
})
export class LayoutComponent {
  sidebarCollapsed = false;

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout() {
    // Implementar logout
    console.log('Logout clicked');
  }
}