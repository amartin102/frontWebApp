// pages/login/login.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  template: `
    <div class="login-container">
      <p-card header="Iniciar Sesión" styleClass="login-card">
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="field">
            <label for="username">Usuario</label>
            <input pInputText id="username" formControlName="username" />             
            @if (loginForm.get('username')?.invalid && loginForm.get('username')?.touched) {
              <small class="p-error">Usuario es requerido</small>
            }
          </div>

          <div class="field">
            <label for="password">Contraseña</label>
            <p-password id="password" formControlName="password" [feedback]="false" />
            @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
              <small class="p-error">Contraseña es requerida</small>
            }
          </div>

            <!-- Mensaje de error general -->
            @if (errorMessage) {
                <div class="p-error text-center mb-3">
                    {{ errorMessage }}
                </div>
            }

          <button pButton type="submit" label="Ingresar" [disabled]="loginForm.invalid" class="w-full"></button>
        </form>
      </p-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .login-card {
      width: 400px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  `]
})
export class LoginComponent {

  loginForm: FormGroup = new FormGroup({});
  errorMessage : string = ''

  constructor(private fb: FormBuilder, private router: Router) {

    this.initializeForm();
  }
  
    private initializeForm(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }
  
  onSubmit() {

     if (this.loginForm.valid) {
        const username = this.loginForm.value.username;
        const password = this.loginForm.value.password;
        
        // Validación genérica de credenciales
        if (username === 'admin' && password === 'admin123') {
            // Simular login exitoso
            localStorage.setItem('token', 'fake_token');
            localStorage.setItem('username', username);
            this.router.navigate(['/layout']);
        } else {
            // Mostrar error de credenciales inválidas
            // O puedes usar un mensaje en el template
            this.errorMessage = 'Credenciales inválidas';
        }
    } else {
        // Marcar todos los campos como touched para mostrar errores
        this.markFormGroupTouched(this.loginForm);
    }

  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
        const control = formGroup.get(key);
        if (control instanceof FormGroup) {
            this.markFormGroupTouched(control);
        } else {
            control?.markAsTouched();
        }
    });
}
}