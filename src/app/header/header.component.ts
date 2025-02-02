import { Component, OnInit } from '@angular/core';
import { UserService } from '../services/user.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  showLoginPopup = false;
  showSignupPopup = false;
  user$!: Observable<any>;
  showDropdown = false;

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit() {
    this.user$ = this.userService.user$;
  }

  closeLoginPopup() {
    this.showLoginPopup = false;
  }

  closeSignupPopup() {
    this.showSignupPopup = false;
  }

  openLoginPopup() {
    this.showLoginPopup = true;
  }

  openSignupPopup() {
    this.showSignupPopup = true;
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  logout() {
    this.userService.clearUser();
    this.router.navigate(['/login']);
    this.showDropdown = false;
  }
}
