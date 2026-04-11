import { User } from '../../../core/models/user';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RegisterRequest } from '../../../core/models/user';
import { AuthService } from '../../../core/services/auth.service';

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

  constructor(private authService: AuthService) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
  
  onSubmit() {
    this.authService.register(this.registerRequest).subscribe(success => {
      if(success) {
        // Navigate or show success message
        console.log("Registration successful");
      }
    });
  }
}
