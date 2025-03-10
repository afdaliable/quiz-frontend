import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { ThemeService } from '../services/theme.service';
import { SupabaseService } from '../services/supabase.service';
import { Subscription } from 'rxjs';

interface PaketSoal {
  id_nama_paket_soal: number;
  nama_paket_soal: string;
  id_kategori_soal: number;
  kategori_soal: string;
  jumlah_soal: number;
}

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit {
  selectedPaket: PaketSoal | null = null;
  durasiOptions: number[] = [15, 30, 45, 60, 90, 120];
  selectedDurasi: number = 15;
  user: any;
  isDarkMode: boolean = false;
  isAuthenticated: boolean = false;
  private sessionSubscription: Subscription | null = null;


  constructor(
    private router: Router, 
    private userService: UserService,
    private themeService: ThemeService,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    const session = this.supabaseService.currentSession;
    this.isAuthenticated = !!session;
    if (session) {
      this.user = session.user.user_metadata;
    }
    
    this.sessionSubscription = this.supabaseService.session$.subscribe(session => {
      this.isAuthenticated = !!session;
      if (session) {
        this.user = session.user.user_metadata;
      } else {
        this.user = null;
      }
    });

    this.userService.user$.subscribe(user => {
      if (user && !this.user) {
        this.user = user;
      }
    });

    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);
    }

    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
  }

  startQuiz() {
    if (this.selectedPaket) {
      localStorage.setItem('durasi', this.selectedDurasi.toString());
      this.router.navigate(['/question']);
    }
  }
}
