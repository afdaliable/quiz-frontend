import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { QuestionService } from '../services/question.service';

interface Category {
  id: number;
  nama_kategori: string;
  deskripsi: string;
}

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit {
  categories: Category[] = [];
  filteredCategories: Category[] = [];
  searchTerm: string = '';

  constructor(
    private questionService: QuestionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.questionService.getAllCategories().subscribe({
      next: (data: Category[]) => {
        this.categories = data;
        this.filteredCategories = data;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  filterCategories(): void {
    this.filteredCategories = this.categories.filter(category =>
      category.nama_kategori.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  selectCategory(category: Category): void {
    this.router.navigate(['/paket-soal', category.nama_kategori]);
  }
} 