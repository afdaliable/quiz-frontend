// src/app/daftar-soal/daftar-soal.component.ts
import { Component, OnInit } from '@angular/core';
import { DaftarSoalService } from '../services/daftar-soal.service';
import { tap } from 'rxjs/operators';

interface Soal {
  id: number;
  soal: string;
  opt1: string;
  opt2: string;
  opt3: string;
  opt4: string;
  opt5: string;
  correct_answer: string;
  deskripsi_kategori: string;
  deskripsi_paket_soal: string;
  id_kategori: string;
  id_paket_soal: string;
  solution: string;
}

@Component({
  selector: 'app-daftar-soal',
  templateUrl: './daftar-soal.component.html',
  styleUrls: ['./daftar-soal.component.css'],
})
export class DaftarSoalComponent implements OnInit {
  soalList: Soal[] = [];

  constructor(private soalService: DaftarSoalService) {}

  ngOnInit(): void {
    console.log('DaftarSoalComponent initialized');
    this.getSoalList();
  }

  getSoalList(): void {
    this.soalService.getSoalList().subscribe(
      (data) => {
        console.log('Data received:', data);
        this.soalList = data;
        console.log('soalList updated:', this.soalList);
      },
      (error) => {
        console.error('Error fetching soal list:', error);
      }
    );
  }
}
