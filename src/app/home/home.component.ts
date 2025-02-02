import { Component, OnInit } from '@angular/core';
import { QuestionService } from '../services/question.service';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';

interface PaketSoal {
  id_nama_paket_soal: number;
  nama_paket_soal: string;
  id_kategori_soal: number;
  kategori_soal: string;
  jumlah_soal: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  paketSoalList: PaketSoal[] = [];
  isLoggedIn: boolean = false;

  constructor(
    private questionService: QuestionService,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.checkLoginStatus();
    this.loadPaketSoal();
  }

  checkLoginStatus(): void {
    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token;
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
    } else {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.userService.setUser(JSON.parse(userData));
      }
    }
  }

  loadPaketSoal(): void {
    if (this.isLoggedIn) {
      this.questionService.getListPaketSoal().subscribe({
        next: (data: PaketSoal[]) => {
          this.paketSoalList = data;
        },
        error: (error) => {
          console.error('Error fetching paket soal:', error);
          if (error.status === 401) {
            this.isLoggedIn = false;
            localStorage.clear();
            this.router.navigate(['/login']);
          }
        }
      });
    }
  }

  selectPaketSoal(paketSoal: PaketSoal): void {
    localStorage.setItem('selectedPaket', JSON.stringify(paketSoal));
    this.router.navigate(['/welcome']);
  }
}