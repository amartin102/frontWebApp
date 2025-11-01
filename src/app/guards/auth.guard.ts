import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Verificar si existe el token en localStorage
  const token = localStorage.getItem('token');
  
  if (!token) {
    // Si no hay token, redirigir al login
    router.navigate(['/login']);
    return false;
  }
  
  return true;
};
