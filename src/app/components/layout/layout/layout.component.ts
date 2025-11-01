// components/layout/layout.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { PanelMenuModule } from 'primeng/panelmenu';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MenubarModule, 
    SidebarModule, 
    ButtonModule, 
    AvatarModule,
    PanelMenuModule
  ],
  template: `
    <div class="layout-wrapper">
      <!-- Sidebar -->
      <div class="sidebar" [class.sidebar-collapsed]="sidebarCollapsed">
        <div class="sidebar-header">
          <i class="pi pi-building" style="font-size: 2rem; color: white; margin-bottom: 0.5rem;"></i>
          <h3>Sistema</h3>
        </div>
        <nav class="sidebar-nav">
          <p-panelMenu [model]="menuItems" [multiple]="false" [style]="{'width':'100%'}"></p-panelMenu>
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
      position: relative;
      overflow: hidden;
    }

    .sidebar {
      width: 250px;
      background: #0A509F;
      transition: all 0.3s ease;
      box-shadow: 2px 0 5px rgba(0,0,0,0.1);
      height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 2;
    }

    .sidebar-collapsed {
      width: 70px;
    }

    .sidebar-header {
      padding: 1.5rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      height: 100px;
      transition: all 0.3s ease;
      white-space: nowrap;
      overflow: hidden;
    }

    .sidebar-collapsed .sidebar-header {
      padding: 1rem 0.5rem;
    }

    .sidebar-collapsed .sidebar-header i {
      font-size: 1.5rem;
      margin-bottom: 0;
    }

    .sidebar-collapsed .sidebar-header h3 {
      display: none;
    }

    .sidebar-header h3 {
      color: white;
      margin: 0;
      font-weight: 600;
    }

    .sidebar-nav {
      padding: 1rem;
      overflow-y: auto;
      overflow-x: hidden;
      flex: 1;
      transition: all 0.3s ease;
    }

    .sidebar-collapsed .sidebar-nav {
      padding: 1rem 0;
    }

    /* Estilos para el PanelMenu */
    :host ::ng-deep .p-panelmenu {
      background: transparent;
      width: 100%;
      transition: all 0.3s ease;
    }

    :host ::ng-deep .p-panelmenu .p-panelmenu-root-list {
      width: 100%;
    }

    /* Estilos normales del menú */
    :host ::ng-deep .p-panelmenu .p-panelmenu-header > a {
      overflow: hidden;
      white-space: nowrap;
      transition: all 0.3s ease;
    }

    :host ::ng-deep .p-panelmenu .p-menuitem-text {
      transition: all 0.3s ease;
    }

    /* Estilos cuando está colapsado */
    .sidebar-collapsed ::ng-deep .p-panelmenu .p-panelmenu-header > a {
      justify-content: center;
      padding: 1rem 0;
    }

    .sidebar-collapsed ::ng-deep .p-panelmenu .p-menuitem-text,
    .sidebar-collapsed ::ng-deep .p-panelmenu .p-submenu-icon,
    .sidebar-collapsed ::ng-deep .p-panelmenu .p-panelmenu-content {
      display: none;
    }

    .sidebar-collapsed ::ng-deep .p-panelmenu .p-menuitem-icon {
      margin: 0;
    }

    /* Ajustes de íconos */
    :host ::ng-deep .p-panelmenu .p-menuitem-icon {
      transition: all 0.3s ease;
      margin-right: 0.5rem;
    }

    /* Estilo del ítem principal */
    :host ::ng-deep .p-panelmenu .p-panelmenu-header > a {
      background: rgba(255,255,255,0.7);
      border: none;
      border-radius: 6px;
      color: #000;
      padding: 1rem;
      margin-bottom: 0.3rem;
      transition: all 0.3s ease;
    }

    /* Hover del ítem principal */
    :host ::ng-deep .p-panelmenu .p-panelmenu-header:not(.p-highlight):not(.p-disabled) > a:hover {
      background: rgba(0,0,0,0.15);
      transform: translateX(5px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      color: white;
    }

    /* Ítem principal activo */
    :host ::ng-deep .p-panelmenu .p-panelmenu-header.p-highlight > a {
      background: rgba(0,0,0,0.15);
      border-radius: 6px 6px 0 0;
      border-bottom: 2px solid rgba(255,255,255,0.5);
      color: white;
    }

    /* Contenedor del submenú */
    :host ::ng-deep .p-panelmenu .p-panelmenu-content {
      background: rgba(255,255,255,0.7);
      border: none;
      border-radius: 0 0 6px 6px;
      margin-bottom: 0.3rem;
    }

    /* Items del submenú */
    :host ::ng-deep .p-panelmenu .p-panelmenu-content .p-menuitem > a {
      color: #000;
      padding: 0.75rem 1.5rem;
      transition: all 0.3s ease;
      border-radius: 4px;
      margin: 0.2rem 0.5rem;
    }

    /* Hover de items del submenú */
    :host ::ng-deep .p-panelmenu .p-panelmenu-content .p-menuitem > a:hover {
      background: rgba(0,0,0,0.1);
      transform: translateX(5px);
      color: white;
    }

    /* Texto de los items */
    :host ::ng-deep .p-panelmenu .p-menuitem-text {
      color: inherit;
      font-weight: 500;
    }

    /* Iconos */
    :host ::ng-deep .p-panelmenu .p-menuitem-icon {
      color: inherit;
    }

    /* Item activo del submenú */
    :host ::ng-deep .p-panelmenu .p-panelmenu-content .p-menuitem > a.router-link-active {
      background: #0A509F;
      color: white;
      font-weight: 600;
      border-right: 3px solid white;
    }

    /* Estilos específicos para el modo colapsado */
    .sidebar-collapsed ::ng-deep .p-panelmenu .p-panelmenu-header > a {
      width: 46px;
      height: 46px;
      margin: 0.5rem auto;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sidebar-collapsed ::ng-deep .p-panelmenu .p-panelmenu-header > a:hover {
      transform: scale(1.1);
      background: rgba(255,255,255,0.2);
    }

    .sidebar-collapsed ::ng-deep .p-panelmenu .p-panelmenu-header.p-highlight > a {
      background: rgba(255,255,255,0.3);
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      position: relative;
      z-index: 1;
      transition: margin-left 0.3s ease;
    }

    .layout-wrapper {
      display: flex;
      height: 100vh;
      background-color: #f8f9fa;
      position: relative;
      overflow-x: hidden;
    }

    .header {
      background: white;
      padding: 1rem 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 70px;
      position: relative;
      z-index: 1;
    }

    .header-left {
      display: flex;
      align-items: center;
    }

    :host ::ng-deep .header-left .p-button.p-button-text {
      color: #0A509F;
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

  constructor(private router: Router) {}

  menuItems: MenuItem[] = [
    {
      label: 'Usuarios',
      icon: 'pi pi-users',
      items: [
        {
          label: 'Administrar Usuarios',
          routerLink: '/layout/users/manage'
        },
        {
          label: 'Roles y Permisos',
          routerLink: '/layout/users/roles'
        }
      ]
    },
    {
      label: 'Parámetros',
      icon: 'pi pi-cog',
      items: [
        {
          label: 'Maestro Parámetros',
          routerLink: '/layout/parameters/master'
        },
        {
          label: 'Valores Parámetros',
          routerLink: '/layout/parameters/values'
        }
      ]
    },
    {
      label: 'Turnos',
      icon: 'pi pi-calendar-clock',
      items: [
        {
          label: 'Administrar Turnos',
          routerLink: '/layout/turns/manage'
        }
      ]
    },
    {
      label: 'Nómina',
      icon: 'pi pi-calculator',
      items: [
        {
          label: 'Gestionar Nómina',
          routerLink: '/layout/payroll/manage'
        }
      ]
    }
  ];

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout() {
    // Limpiar el token del localStorage
    localStorage.removeItem('token');
    
    // Redirigir al login
    this.router.navigate(['/login']);
  }
}