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
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, PasswordModule, ButtonModule, MessageModule, AvatarModule],
  template: `
    <div class="login-container">
      <div class="login-box">
        <div class="login-header">
          <p-avatar icon="pi pi-user" styleClass="login-avatar" size="xlarge"></p-avatar>
        </div>
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="field">
            <span class="p-input-icon-left w-full">
              <i class="pi pi-user"></i>
              <input type="text" pInputText class="w-full" placeholder="Usuario" 
                     formControlName="username" />
            </span>
            @if (loginForm.get('username')?.invalid && loginForm.get('username')?.touched) {
              <small class="p-error">Usuario es requerido</small>
            }
          </div>

          <div class="field">
            <span class="p-input-icon-left w-full password-container">
              <i class="pi pi-lock"></i>
              <p-password id="password" formControlName="password" [feedback]="false"
                         [toggleMask]="true" placeholder="Contraseña"
                         styleClass="w-full" [inputStyle]="{'width': '100%', 'padding-left': '2.5rem'}"/>
            </span>
            @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
              <small class="p-error">Contraseña es requerida</small>
            }
          </div>

          @if (errorMessage) {
            <div class="p-error text-center mb-3">
              {{ errorMessage }}
            </div>
          }

          <button pButton type="submit" label="Login" 
                  [disabled]="loginForm.invalid" 
                  class="w-full login-button"></button>
          
          <div class="text-center mt-3">
            <a href="#" class="forgot-password">Forget password</a>
          </div>
        </form>
        
        <div class="login-footer">
          <small>App Web v1.0 - 2025</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #fff;
      padding: 1rem;
    }

    .login-box {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 
        0 0 0 2px rgba(10, 80, 159, 0.1),
        0 0 20px 0 rgba(10, 80, 159, 0.2),
        0 0 40px 0 rgba(10, 80, 159, 0.1);
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .login-avatar {
      width: 5rem !important;
      height: 5rem !important;
      background-color: #0A509F !important;
    }

    .login-avatar .p-avatar-icon {
      font-size: 2.5rem !important;
    }

    .field {
      margin-bottom: 1.5rem;
    }

    .login-button {
      background-color: #0A509F;
      border: none;
      height: 3rem;
      font-size: 1.1rem;
    }

    .login-button:enabled:hover {
      background-color: #094589;
    }

    .forgot-password {
      color: #0A509F;
      text-decoration: none;
    }

    .forgot-password:hover {
      text-decoration: underline;
    }

    .login-footer {
      text-align: center;
      margin-top: 2rem;
      color: #666;
    }

    :host ::ng-deep .p-password input {
      width: 100%;
    }

    :host ::ng-deep .p-input-icon-left > .p-inputtext {
      padding-left: 2.5rem;
    }

    :host ::ng-deep .p-input-icon-left {
      position: relative;
      display: block;
    }

    :host ::ng-deep .p-input-icon-left > i {
      left: 0.75rem;
      color: #0A509F;
      font-size: 1.2rem;
      transition: all 0.3s ease;
      z-index: 2;
    }

    :host ::ng-deep .p-input-icon-left:focus-within > i {
      transform: scale(1.1);
      color: #1976D2;
    }

    :host ::ng-deep .password-container {
      position: relative;
      display: block;
    }

    :host ::ng-deep .password-container .p-password {
      width: 100%;
    }

    :host ::ng-deep .password-container .p-password input {
      padding-left: 2.5rem;
      width: 100%;
    }

    :host ::ng-deep .password-container i {
      z-index: 2;
      color: #0A509F;
      font-size: 1.2rem;
    }

    :host ::ng-deep .password-container:focus-within i {
      transform: scale(1.1);
      color: #1976D2;
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