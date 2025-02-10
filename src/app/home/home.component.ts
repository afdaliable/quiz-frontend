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
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.userService.setUser(JSON.parse(userData));
    this.isLoggedIn = true;
    this.loadPaketSoal();
  }

  loadPaketSoal(): void {
    this.questionService.getListPaketSoal().subscribe({
      next: (data: PaketSoal[]) => {
        this.paketSoalList = data;
      },
      error: (error) => {
        console.error('Error fetching paket soal:', error);
        if (error.status === 401) {
          localStorage.clear();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  selectPaketSoal(paketSoal: PaketSoal): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    
    localStorage.setItem('selectedPaket', JSON.stringify(paketSoal));
    this.router.navigate(['/welcome']);
  }
}