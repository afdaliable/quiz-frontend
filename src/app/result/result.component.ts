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
  selector: 'app-result',
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.scss']
})
export class ResultComponent implements OnInit {
  name: string = '';
  selectedPaket: PaketSoal | null = null;
  totalQuestions: number = 0;
  answeredQuestions: number = 0;
  unansweredQuestions: number = 0;
  showScore: boolean = false;
  points: number = 0;
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;
  currentUser: any;

  constructor(private router: Router, private userService: UserService) {}

  ngOnInit(): void {
    console.log('Initializing result component...');
    this.name = localStorage.getItem('name') || '';
    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);
    }
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }
    this.totalQuestions = parseInt(localStorage.getItem('totalQuestions') || '0');
    this.answeredQuestions = parseInt(localStorage.getItem('answeredQuestions') || '0');
    this.unansweredQuestions = this.totalQuestions - this.answeredQuestions;
    this.points = parseInt(localStorage.getItem('points') || '0');
    this.correctAnswers = parseInt(localStorage.getItem('correctAnswers') || '0');
    this.incorrectAnswers = parseInt(localStorage.getItem('incorrectAnswers') || '0');
  }

  toggleScore(): void {
    this.showScore = !this.showScore;
  }

  reviewQuiz(): void {
    this.router.navigate(['/review']);
  }
}