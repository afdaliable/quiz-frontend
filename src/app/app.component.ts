import { Component, OnInit } from '@angular/core';
import { UserService } from './services/user.service';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  user$!: Observable<any>;

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit() {
    this.user$ = this.userService.user$;
  }

  logout() {
    this.userService.clearUser();
    this.router.navigate(['/login']);
  }
}
