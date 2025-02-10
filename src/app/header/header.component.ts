import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  user$: Observable<any>;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.user$ = this.authService.user$.pipe(
      map(user => {
        if (!user) return null;
        return {
          ...user,
          display_name: user.display_name || user.email.split('@')[0]
        };
      })
    );
  }

  ngOnInit(): void {
    // Initialize user state from localStorage if available
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.authService.setUser(user);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
