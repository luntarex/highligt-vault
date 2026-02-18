import { User } from './../../../models/user';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RegisterRequest } from '../../../models/user';

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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
  onSubmit() {
    console.log('Registiring user data sent to the backend',this.registerRequest);
  }
}
