import { User } from '../../../core/models/user';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { RegisterRequest } from '../../../core/models/user';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  registerRequest: RegisterRequest = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  };
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router, private toast: ToastService) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    this.authService.register(this.registerRequest).subscribe({
      next: (res) => {
        if(res) {
          this.toast.success('Registration successful!');
          // Auto-login after successful registration
          this.authService.login({
            username: this.registerRequest.username,
            password: this.registerRequest.password
          }).subscribe(() => {
            this.router.navigate(['/complete-profile']);
          });
        }
      },
      error: (err) => {
        let msg = 'Registration failed. Please try again.';
        if (err.error && err.error.message) {
          msg = err.error.message;
        }
        this.toast.error(msg);
      }
    });
  }
}
