import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoginRequest } from '../../../core/models/user';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { getSafeErrorMessage } from '../../../core/utils/error-message';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterModule, TranslocoModule],
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
        let message = 'Login failed. Please try again.';
        if (err.status === 401) {
          message = 'Invalid credentials';
        } else {
          message = getSafeErrorMessage(err, message);
        }

        this.toast.error(message);
      }
    });
  }
}
