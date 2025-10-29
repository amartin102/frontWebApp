import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { 
        path: '', 
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) 
    },
    {
        path: 'layout',
        loadComponent: () => import('./components/layout/layout/layout.component').then(m => m.LayoutComponent),
        canActivate: [authGuard],
        children: [
             { path: 'parameters/master', loadComponent: () => import('./pages/master-parameters/master-parameters.component').then(x=> x.MasterParametersComponent)},
            { path: 'parameters/values', loadComponent: () => import('./pages/parameter-values/parameter-values.component').then(x=> x.ParameterValuesComponent)},
            // { path: 'parameters_values', loadComponent: () => import('./pages/parameters/parameters_values/parameter_values.component').then(m => m.ParameterValuesComponent) },
            
            // Redirección cuando está vacío el path
            { path: '', redirectTo: 'login', pathMatch: 'full' }
        ]
    },
    // Ruta comodín para rutas no encontradas
    { path: '**', redirectTo: 'login' }
];