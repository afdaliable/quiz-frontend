import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface PaketSoal {
  id_nama_paket_soal: number;
  nama_paket_soal: string;
  id_kategori_soal: number;
  kategori_soal: string;
  jumlah_soal: number;
}

@Component({
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit {
  name: string = '';
  selectedPaket: PaketSoal | null = null;
  durasiOptions: number[] = [15, 30, 45, 60, 90, 120];
  selectedDurasi: number = 15;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);
    }
  }

  startQuiz() {
    if (this.name && this.selectedPaket) {
      localStorage.setItem('name', this.name);
      localStorage.setItem('durasi', this.selectedDurasi.toString());
      this.router.navigate(['/question']);
    }
  }
}
