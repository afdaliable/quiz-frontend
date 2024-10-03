import { Component, OnInit } from '@angular/core';
import { QuestionService } from '../services/question.service';
import { Router } from '@angular/router';

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

  constructor(private questionService: QuestionService, private router: Router) {}

  ngOnInit(): void {
    this.questionService.getListPaketSoal().subscribe(
      (data: PaketSoal[]) => {
        this.paketSoalList = data;
      },
      (error) => {
        console.error('Error fetching paket soal:', error);
      }
    );
  }

  selectPaketSoal(paketSoal: PaketSoal): void {
    localStorage.setItem('selectedPaket', JSON.stringify(paketSoal));
    this.router.navigate(['/welcome']);
  }
}