import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';
import { PaketSoal } from '../models/paket-soal.model';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit, OnDestroy {
  selectedPaket: PaketSoal | null = null;
  durasiOptions: number[] = [15, 30, 45, 60, 90, 120];
  selectedDurasi: number = 15;
  user: any;
  isDarkMode: boolean = false;
  isAuthenticated: boolean = false;
  private userSubscription: Subscription | null = null;


  constructor(
    private router: Router, 
    private userService: UserService,
    private themeService: ThemeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.authService.getToken();
    this.isAuthenticated = !!token;
    
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.user = user;
    });

    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);
    }

    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  startQuiz() {
    if (this.selectedPaket) {
      // Validate the selected paket
      const hasValidId = this.selectedPaket.id || this.selectedPaket.id_nama_paket_soal;
      if (!hasValidId || !this.selectedPaket.nama_paket_soal || !this.selectedPaket.kategori_soal) {
        console.error('Invalid selected paket:', this.selectedPaket);
        alert('Error: Invalid quiz data. Please go back and select a quiz again.');
        return;
      }
      
      console.log('Starting quiz with paket:', this.selectedPaket);
      localStorage.setItem('durasi', this.selectedDurasi.toString());
      this.router.navigate(['/question']);
    } else {
      console.error('No paket selected');
      alert('Please select a quiz package first.');
    }
  }
}
