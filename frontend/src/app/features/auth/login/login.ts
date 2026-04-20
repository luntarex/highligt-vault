import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoginRequest } from '../../../core/models/user';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginRequest: LoginRequest = {
    username: '',
    password: ''
  };
  showPassword = false;
  isSubmitting = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private toast: ToastService
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    this.isSubmitting = true;
    this.authService.login(this.loginRequest).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toast.success('Welcome back!');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Login error:', err);
        
        let message = 'Login failed. Please try again.';
        if (err.status === 401) {
          message = 'Invalid credentials';
        } else if (err.error && err.error.message) {
          message = err.error.message;
        }

        this.toast.error(message);
      }
    });
  }
}
