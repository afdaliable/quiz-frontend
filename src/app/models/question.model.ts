export interface Question {
  id: number;
  questionText: string;
  options: Option[];
  correctAnswer: number;
  explanation: string;
  userAnswer?: number;
}

export interface Option {
  id: number;
  text: string;
}

export interface ApiResponse {
  kumpulan_soal: any[];
  status: string;
  message: string;
} 