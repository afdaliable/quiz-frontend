import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef } from '@angular/core';
import { ThemeService } from '../services/theme.service';
import { Subscription } from 'rxjs';

interface JalurUjian {
  icon: string;
  name: string;
  description: string;
  tags: string[];
  status: 'live' | 'q3-2026' | 'q4-2026' | '2027';
}

interface RoadmapFase {
  fase: string;
  period: string;
  title: string;
  items: string[];
}

interface FaqItem {
  q: string;
  a: string;
}

interface Testimoni {
  name: string;
  role: string;
  text: string;
  initial: string;
}

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit, OnDestroy, AfterViewInit {
  isDarkMode = false;
  private themeSubscription: Subscription | null = null;
  openFaqIndex: number | null = null;

  jalurList: JalurUjian[] = [
    {
      icon: '🏛️',
      name: 'Seleksi ASN',
      description: 'Persiapan lengkap untuk seleksi Aparatur Sipil Negara dari SKD hingga SKB.',
      tags: ['CPNS SKD', 'PPPK Guru', 'Ujian Dinas', 'UPKP', 'SKB Jabatan'],
      status: 'live'
    },
    {
      icon: '🎓',
      name: 'Masuk PTN & Kedinasan',
      description: 'Tembus perguruan tinggi negeri terbaik dan sekolah kedinasan impianmu.',
      tags: ['SNBT', 'Simak UI', 'UM UGM', 'IPDN', 'Akmil'],
      status: 'q3-2026'
    },
    {
      icon: '📜',
      name: 'Profesi & Sertifikasi',
      description: 'Raih sertifikasi profesional dan lisensi praktik yang diakui nasional.',
      tags: ['PPG/UTN', 'UKMPPD', 'UKNI', 'CPA/CA', 'PERADI'],
      status: 'q3-2026'
    },
    {
      icon: '🌏',
      name: 'Bahasa & Internasional',
      description: 'Kuasai skor bahasa internasional untuk karier dan studi global.',
      tags: ['TOEFL ITP', 'IELTS', 'JLPT', 'HSK', 'DELF'],
      status: 'q4-2026'
    },
    {
      icon: '🎯',
      name: 'Beasiswa',
      description: 'Wujudkan impian kuliah dengan beasiswa bergengsi dalam dan luar negeri.',
      tags: ['LPDP', 'Beasiswa Unggulan', 'BPPDN', 'Chevening'],
      status: 'q4-2026'
    },
    {
      icon: '💼',
      name: 'Seleksi Non-PNS',
      description: 'Bersiap menghadapi seleksi BUMN dan perusahaan nasional terkemuka.',
      tags: ['BUMN', 'Bank Indonesia', 'OJK', 'BCAT', 'Kemenkeu'],
      status: 'q4-2026'
    }
  ];

  roadmapFases: RoadmapFase[] = [
    {
      fase: 'Fase 1',
      period: 'Q2 2026',
      title: 'Fondasi & Infrastruktur',
      items: ['Platform web & mobile', 'Seleksi ASN (CPNS, PPPK)', 'Sistem premium & pembayaran', 'Dashboard admin']
    },
    {
      fase: 'Fase 2',
      period: 'Q3 2026',
      title: 'Ekspansi Core',
      items: ['SNBT & PTN Kedinasan', 'SKB per jabatan lengkap', 'PPG/UTN & UKMPPD', 'Fitur diskusi & komunitas']
    },
    {
      fase: 'Fase 3',
      period: 'Q4 2026',
      title: 'Professional & Bahasa',
      items: ['Seleksi BUMN & OJK', 'TOEFL ITP & IELTS', 'Beasiswa LPDP', 'Fitur AI & adaptive learning']
    },
    {
      fase: 'Fase 4',
      period: '2027',
      title: 'Full Coverage',
      items: ['500+ paket soal', 'Semua jalur ujian Indonesia', 'Komunitas jutaan pengguna', 'Garansi lulus premium']
    }
  ];

  faqItems: FaqItem[] = [
    {
      q: 'Apakah QuizKu gratis?',
      a: 'Ya! Paket dasar QuizKu gratis selamanya. Kamu bisa mengakses ratusan soal tanpa bayar. Paket premium tersedia untuk akses penuh ke semua soal, pembahasan lengkap, dan fitur eksklusif.'
    },
    {
      q: 'Apakah semua jalur ujian sudah tersedia?',
      a: 'Saat ini QuizKu fokus pada Seleksi ASN (CPNS SKD, PPPK). Jalur lain seperti SNBT, PPG, UKMPPD, TOEFL, BUMN, dan Beasiswa sedang dalam pengembangan aktif dan akan hadir di Q3–Q4 2026. Kami berkomitmen untuk jujur tentang roadmap kami.'
    },
    {
      q: 'Bagaimana kualitas soal di QuizKu?',
      a: 'Soal-soal di QuizKu dikurasi dan diverifikasi oleh tim ahli di bidangnya. Setiap soal dilengkapi pembahasan detail sehingga kamu tidak hanya latihan, tapi benar-benar mengerti materinya.'
    },
    {
      q: 'Apakah ada aplikasi mobile?',
      a: 'Ya! QuizKu tersedia sebagai aplikasi mobile (Android & iOS) sehingga kamu bisa latihan kapan saja dan di mana saja, bahkan dalam perjalanan.'
    },
    {
      q: 'Bagaimana cara berlangganan premium?',
      a: 'Setelah login, masuk ke menu "Paket Premium" dan pilih paket yang sesuai kebutuhan. Pembayaran dapat dilakukan melalui berbagai metode: transfer bank, e-wallet, QRIS, dan kartu kredit.'
    },
    {
      q: 'Apakah ada garansi uang kembali?',
      a: 'Kami menawarkan garansi kepuasan 7 hari. Jika kamu tidak puas dengan layanan premium, hubungi kami dalam 7 hari setelah pembelian dan kami akan mengembalikan pembayaran penuh.'
    }
  ];

  testimonials: Testimoni[] = [
    {
      name: 'Rika Handayani',
      role: 'Lolos CPNS Kemenkeu 2024',
      text: 'Awalnya skeptis, tapi setelah rutin latihan 2 bulan di QuizKu, skor TWK saya naik drastis. Pembahasannya detail banget, beda dari platform lain.',
      initial: 'R'
    },
    {
      name: 'Budi Santoso',
      role: 'Lolos PPPK Guru 2024',
      text: 'Saya guru honorer 8 tahun, akhirnya lolos PPPK setelah latihan intensif di QuizKu. Soal-soalnya sangat relevan dengan ujian aslinya.',
      initial: 'B'
    },
    {
      name: 'Dewi Puspita',
      role: 'Mahasiswa PKN STAN 2025',
      text: 'Platform terbaik untuk persiapan ujian kedinasan. Fitur review per soal membantu saya mengidentifikasi kelemahan dan fokus belajar lebih efisien.',
      initial: 'D'
    }
  ];

  steps = [
    { num: '1', title: 'Daftar Gratis', desc: 'Buat akun dalam 30 detik. Tidak perlu kartu kredit.' },
    { num: '2', title: 'Pilih Jalur', desc: 'Pilih jenis ujian yang ingin kamu persiapkan.' },
    { num: '3', title: 'Latihan & Pahami', desc: 'Kerjakan soal dan baca pembahasan detail setiap jawaban.' },
    { num: '4', title: 'Pantau & Tingkatkan', desc: 'Lihat progres, statistik akurasi, dan terus tingkatkan skor.' }
  ];

  features = [
    { icon: '📚', title: 'Ribuan Soal Berkualitas', desc: 'Bank soal terus diperbarui mengikuti pola ujian terbaru.' },
    { icon: '💡', title: 'Pembahasan Detail', desc: 'Setiap soal disertai pembahasan lengkap agar kamu benar-benar paham.' },
    { icon: '📊', title: 'Statistik & Progres', desc: 'Pantau perkembangan belajarmu dengan grafik dan analisis mendalam.' },
    { icon: '🔖', title: 'Bookmark Soal', desc: 'Tandai soal sulit untuk dikerjakan ulang kapan saja.' },
    { icon: '💬', title: 'Diskusi Komunitas', desc: 'Tanya dan diskusi soal bersama ribuan pengguna lain.' }
  ];

  constructor(
    private themeService: ThemeService,
    private el: ElementRef
  ) {}

  ngOnInit() {
    this.themeSubscription = this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
  }

  ngAfterViewInit() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    this.el.nativeElement.querySelectorAll('.reveal').forEach((elem: Element) => observer.observe(elem));
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  toggleFaq(index: number) {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'live': return '✅ Live';
      case 'q3-2026': return '🔜 Q3 2026';
      case 'q4-2026': return '🔜 Q4 2026';
      case '2027': return '🔜 2027';
      default: return '';
    }
  }

  getStatusClass(status: string): string {
    if (status === 'live') {
      return this.isDarkMode
        ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700'
        : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
    return this.isDarkMode
      ? 'bg-gray-700/60 text-gray-400 border border-gray-600'
      : 'bg-gray-100 text-gray-500 border border-gray-200';
  }

  getCardAccent(status: string): string {
    if (status === 'live') {
      return this.isDarkMode
        ? 'border-indigo-500/50 shadow-indigo-900/20'
        : 'border-indigo-200 shadow-indigo-100/60';
    }
    return this.isDarkMode ? 'border-gray-700' : 'border-gray-200';
  }

  getFaseColor(index: number): string {
    const colors = ['indigo', 'violet', 'purple', 'fuchsia'];
    return colors[index] || 'indigo';
  }
}
