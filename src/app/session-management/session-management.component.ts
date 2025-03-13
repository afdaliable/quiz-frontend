import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Subscription, interval } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-session-management',
  templateUrl: './session-management.component.html',
  styleUrls: ['./session-management.component.css']
})
export class SessionManagementComponent implements OnInit, OnDestroy {
  sessions: any[] = [];
  loading = false;
  error: string | null = null;
  private sessionCheckSubscription?: Subscription;
  private sessionInvalidSubscription?: Subscription;
  showSessionInvalidModal = false;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.loadSessions();
    
    // Check for sessions every minute
    this.sessionCheckSubscription = interval(60000).pipe(
      tap(() => this.loadSessions())
    ).subscribe();
    
    // Subscribe to session invalid notifications
    this.sessionInvalidSubscription = this.authService.sessionInvalid$.subscribe(
      isInvalid => {
        if (isInvalid) {
          this.showSessionInvalidModal = true;
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.sessionCheckSubscription) {
      this.sessionCheckSubscription.unsubscribe();
    }
    if (this.sessionInvalidSubscription) {
      this.sessionInvalidSubscription.unsubscribe();
    }
  }

  loadSessions(): void {
    this.loading = true;
    this.error = null;
    
    this.authService.getUserSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading sessions:', err);
        this.error = 'Failed to load sessions. Please try again.';
        this.loading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error during logout:', err);
      }
    });
  }

  closeSessionInvalidModal(): void {
    this.showSessionInvalidModal = false;
    this.router.navigate(['/login']);
  }
} 