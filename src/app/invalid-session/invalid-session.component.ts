import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-invalid-session',
  templateUrl: './invalid-session.component.html',
  styleUrls: ['./invalid-session.component.css']
})
export class InvalidSessionComponent implements OnInit {
  countdown = 5; // 5 seconds countdown
  private countdownInterval: any;

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Start countdown to redirect to login
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.goToLogin();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    // Clear the interval when component is destroyed
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  goToLogin(): void {
    // Clear the interval and navigate to login
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.router.navigate(['/login']);
  }
} 