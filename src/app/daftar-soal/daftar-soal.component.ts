// src/app/daftar-soal/daftar-soal.component.ts
import { Component, OnInit } from '@angular/core';
import { DaftarSoalService } from '../services/daftar-soal.service';
import { PremiumService } from '../services/premium.service';
import { Router, ActivatedRoute } from '@angular/router';
import { tap, switchMap, catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ThemeService } from '../services/theme.service';

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
  loading = true;
  error = '';
  premiumRequired = false;
  requiredPlanName = '';
  currentPaketSoalId: number | null = null;
  isDarkMode = false;
  accessCheckError = false;

  constructor(
    private soalService: DaftarSoalService,
    private premiumService: PremiumService,
    private router: Router,
    private route: ActivatedRoute,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    console.log('DaftarSoalComponent initialized');
    this.themeService.darkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });
    
    // Get paket soal ID from route params if available
    this.route.params.subscribe(params => {
      if (params['kategori']) {
        // If we have a category parameter, we'll handle it differently
        this.getSoalList();
      } else {
        // Otherwise, check if we have a paket soal ID in the route
        const idParam = this.route.snapshot.paramMap.get('id');
        this.currentPaketSoalId = idParam ? +idParam : null;
        if (this.currentPaketSoalId) {
          this.checkQuizAccess(this.currentPaketSoalId);
        } else {
          this.getSoalList();
        }
      }
    });
  }

  checkQuizAccess(paketSoalId: number): void {
    this.loading = true;
    this.error = '';
    this.accessCheckError = false;
    
    this.premiumService.checkQuizAccess(paketSoalId).pipe(
      finalize(() => {
        this.loading = false;
      }),
      switchMap(data => {
        if (data.has_access) {
          // User has access, load the quiz
          return this.soalService.getSoalListByPaketId(paketSoalId).pipe(
            tap(soalList => {
              this.soalList = soalList;
            }),
            catchError(error => {
              this.error = 'Failed to load quiz questions. Please try again later.';
              console.error('Error loading quiz questions:', error);
              return of(null);
            })
          );
        } else {
          // User doesn't have access, show premium required message
          this.premiumRequired = true;
          this.requiredPlanName = data.required_plan_name || 'Premium';
          console.log('Premium access required:', this.requiredPlanName);
          return of(null);
        }
      }),
      catchError(error => {
        this.error = 'Failed to check quiz access. Server may be unavailable.';
        this.accessCheckError = true;
        console.error('Error checking quiz access:', error);
        return of(null);
      })
    ).subscribe();
  }

  getSoalList(): void {
    this.loading = true;
    this.error = '';
    
    this.soalService.getSoalList().pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe(
      (data) => {
        console.log('Data received:', data);
        this.soalList = data;
        console.log('soalList updated:', this.soalList);
      },
      (error) => {
        this.error = 'Failed to load quiz list. Please try again later.';
        console.error('Error fetching soal list:', error);
      }
    );
  }

  goToPremiumPlans(): void {
    this.router.navigate(['/premium-plans']);
  }
  
  retryAccessCheck(): void {
    if (this.currentPaketSoalId) {
      this.checkQuizAccess(this.currentPaketSoalId);
    }
  }
  
  retryLoadSoalList(): void {
    this.getSoalList();
  }
}
