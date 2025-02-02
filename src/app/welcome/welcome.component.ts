import { Component, OnInit } from '@angular/core';
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
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit {
  selectedPaket: PaketSoal | null = null;
  durasiOptions: number[] = [15, 30, 45, 60, 90, 120];
  selectedDurasi: number = 15;
  user: any;

  constructor(private router: Router, private userService: UserService) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);
    }
    
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
      this.userService.setUser(this.user);
    } else {
      this.router.navigate(['/login']);
    }
  }

  startQuiz() {
    if (this.selectedPaket) {
      localStorage.setItem('durasi', this.selectedDurasi.toString());
      this.router.navigate(['/question']);
    }
  }
}
