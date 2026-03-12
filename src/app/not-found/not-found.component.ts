import { Component } from '@angular/core';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
})
export class NotFoundComponent {
  isDarkMode = false;

  constructor(private themeService: ThemeService) {
    this.themeService.darkMode$.subscribe(isDark => this.isDarkMode = isDark);
  }
}
