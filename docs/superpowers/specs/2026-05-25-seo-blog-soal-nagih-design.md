# SEO Blog Soal Nagih — Design Spec
**Tanggal:** 2026-05-25
**Status:** Approved

---

## 1. Tujuan

Meningkatkan organic traffic ke `nagih.app` dengan membangun SEO layer berupa static site di `soal.nagih.app` yang menargetkan:
- **Prioritas 1:** Soal spesifik (orang copy-paste teks soal ke Google)
- **Prioritas 2:** Topik/materi spesifik ("soal TWK wawasan kebangsaan")
- **Prioritas 3:** Kategori ujian ("latihan soal CPNS terlengkap")

Setiap halaman bertujuan mendorong user ke `nagih.app` untuk daftar/login.

---

## 2. Arsitektur

```
soal.nagih.app (Astro static site)      nagih.app (Angular SPA)
────────────────────────────────         ──────────────────────
- Public HTML, Google dapat index        - Auth required
- Soal + pembahasan tersedia publik      - Interactive practice
- CTA → nagih.app di setiap halaman      - Source of truth data
- Deploy ke Cloudflare Pages             - API backend
```

**Nagih DB** adalah single source of truth. SEO site hanya membaca, tidak pernah menulis.

Soal yang sama muncul di dua konteks berbeda:
- Di `nagih.app`: private, butuh auth, untuk latihan interaktif
- Di `soal.nagih.app`: public HTML statis, untuk Google index

Scraping tidak menjadi concern karena nilai Nagih ada pada pengalaman latihan (timer, simulasi, analytics), bukan pada teks soal yang sudah banyak beredar di internet.

---

## 3. Struktur URL

Hierarki 3 level — penting agar Google tidak menganggap halaman soal individual sebagai thin content spam:

```
soal.nagih.app/
├── /                                    ← Homepage (semua kategori)
├── /cpns/                               ← Halaman kategori
├── /cpns/twk/                           ← Halaman subkategori
├── /cpns/twk/wawasan-kebangsaan/        ← Halaman topik
└── /cpns/twk/soal-[slug]/               ← Halaman soal spesifik
```

Kategori mengikuti struktur yang sudah ada di Nagih: CPNS, PPPK, SNBT, PPG, UKMPPD, TOEFL, BUMN, LPDP.

**Format slug soal:** Diambil dari 8 kata pertama teks soal, dikonversi ke lowercase, spasi diganti `-`, karakter non-alfanumerik dihapus, ditambah ID unik 6 karakter di akhir untuk mencegah collision.
Contoh: `apa-yang-dimaksud-dengan-pancasila-sebagai-dasar-a1b2c3`

---

## 4. Struktur Konten Per Jenis Halaman

### 4a. Halaman Kategori `/cpns/`
Target keyword: *"contoh soal CPNS 2024"*, *"latihan soal CPNS terlengkap"*

```
<title>: Kumpulan Soal CPNS 2024 — Lengkap dengan Pembahasan | Nagih
<H1>:    Kumpulan Soal CPNS 2024 — Lengkap dengan Pembahasan

- Intro paragraph (150-200 kata): apa itu CPNS, materi ujian
- Daftar subkategori (TWK, TIU, TKP) + jumlah soal per subkategori
- CTA: "Latihan soal CPNS di Nagih — gratis untuk paket dasar →"
- FAQ schema (3-5 pertanyaan umum tentang CPNS)
```

### 4b. Halaman Topik `/cpns/twk/wawasan-kebangsaan/`
Target keyword: *"soal TWK wawasan kebangsaan"*, *"contoh soal Pancasila CPNS"*

```
<title>: 50 Contoh Soal TWK Wawasan Kebangsaan + Pembahasan | Nagih
<H1>:    50 Contoh Soal TWK Wawasan Kebangsaan + Pembahasan

- Intro materi (100-150 kata)
- 5-10 contoh soal preview dengan pembahasan lengkap
- Ringkasan materi kunci (poin-poin)
- Link ke semua soal spesifik di topik ini
- CTA: "Latihan 200+ soal TWK di Nagih →"
```

### 4c. Halaman Soal Spesifik `/cpns/twk/soal-[slug]/`
Target keyword: teks soal literal yang di-copy-paste ke Google

```
<title>: [Teks soal truncated 60 karakter] — Jawaban & Pembahasan
<H1>:    [Teks soal lengkap — ini yang diindex Google]

- Pilihan jawaban A-D
- Jawaban benar (dengan highlight)
- Pembahasan (dari pembahasan_enriched, minimal 3-4 paragraf):
    * Kenapa jawaban benar
    * Kenapa opsi lain salah
    * Konteks materi terkait
- Soal serupa: 3-5 soal dari topik yang sama (internal linking)
- CTA: "Latihan soal [topik] lengkap di Nagih →"
```

---

## 5. Strategi Generate Konten

### Fase 1 — Launch Awal (tanpa menunggu semua soal enriched)

| Konten | Cara | Target |
|---|---|---|
| Halaman kategori (10 halaman) | Tulis manual | Minggu 1 |
| Halaman subkategori (~30 halaman) | Template + AI generate | Minggu 1-2 |
| Halaman topik (~100 halaman) | Template + AI generate | Minggu 2-3 |
| Soal sample (5-10 per topik) | Pilih manual, enriched | Minggu 2-3 |

### Fase 2 — Scale (setelah AI enrichment batch selesai)

Astro fetch semua soal dari admin API saat build time, auto-generate ribuan halaman:

```typescript
// src/pages/[kategori]/[topik]/[slug].astro
export async function getStaticPaths() {
  const soal = await fetch(process.env.NAGIH_ADMIN_API + '/soal/public-seo', {
    headers: { Authorization: `Bearer ${process.env.NAGIH_API_TOKEN}` }
  }).then(r => r.json())

  return soal.map(s => ({
    params: { kategori: s.kategori_slug, topik: s.topik_slug, slug: s.slug },
    props: { soal: s }
  }))
}
```

Build sekali → ribuan halaman HTML statis → deploy ke Cloudflare Pages.

### Rebuild Strategy

Setiap kali ada soal baru atau pembahasan diupdate di Nagih, trigger rebuild Astro via Cloudflare Pages webhook. Bisa dijadikan automated deploy setiap malam (cron).

---

## 6. AI Pembahasan Enrichment

### Tujuan

Standarisasi semua pembahasan soal di Nagih DB agar:
1. User di app mendapat pembahasan lebih baik di review page
2. SEO site punya konten yang cukup dalam (tidak thin content)

### Implementasi

- Field baru di DB: `pembahasan_enriched` — jangan overwrite `pembahasan` asli
- Batch job menggunakan Claude API
- Prompt template per kategori ujian (TWK, TIU, TKP, SNBT, dll)

**Prompt structure:**
```
Soal: [teks soal]
Pilihan: A. ... B. ... C. ... D. ...
Jawaban benar: [jawaban]
Pembahasan asli: [pembahasan_asli]

Tulis pembahasan yang:
- Minimal 3-4 kalimat
- Jelaskan kenapa jawaban [X] benar
- Jelaskan kenapa satu opsi lain yang paling mirip salah
- Bahasa Indonesia baku, mudah dipahami pelajar
- Tidak menyebut "pembahasan asli" atau "berdasarkan soal di atas"
```

### Prioritas Enrichment

| Fase | Target | Kriteria |
|---|---|---|
| 1 | Pembahasan kosong atau < 50 karakter | Paling urgent |
| 2 | Kategori paling populer (CPNS TWK, TIU, SNBT) | High traffic first |
| 3 | Semua soal sisanya | Background job |

SEO site bisa launch setelah Fase 1 + 2 enrichment selesai.

---

## 7. Technical Stack

| Layer | Teknologi | Alasan |
|---|---|---|
| Framework | Astro | Static-first, zero JS default, ideal untuk content sites |
| Styling | Tailwind CSS | Konsisten dengan Nagih |
| Deployment | Cloudflare Pages | Free tier, CDN global, auto-deploy dari git |
| Content Fase 1 | Markdown/MDX | Simple, version-controlled |
| Content Fase 2 | Nagih Admin API | Fetch saat build time |
| Domain | soal.nagih.app | Subdomain dari domain utama |

### Struktur Repo (repo baru, terpisah dari quiz-frontend)

```
soal-nagih/
├── src/
│   ├── pages/
│   │   ├── index.astro
│   │   └── [kategori]/
│   │       ├── index.astro
│   │       └── [topik]/
│   │           ├── index.astro
│   │           └── [slug].astro
│   ├── content/
│   │   └── soal/              ← MDX files untuk Fase 1
│   ├── components/
│   │   ├── SoalCard.astro
│   │   ├── Pembahasan.astro
│   │   └── CTANagih.astro
│   └── layouts/
│       └── SoalLayout.astro
├── astro.config.mjs
└── package.json
```

---

## 8. SEO Technical Checklist

Setiap halaman wajib memiliki:

```
✅ <title> unik — teks soal truncated atau "N Soal [topik] + Pembahasan"
✅ <meta description> — dari awal teks pembahasan (150-160 karakter)
✅ <link rel="canonical"> — URL kanonik halaman
✅ Open Graph tags — og:title, og:description, og:url
✅ Structured data — FAQ schema (topik), Article schema (soal)
✅ Sitemap.xml — auto-generated Astro, submit ke Google Search Console
✅ robots.txt — allow semua, disallow /admin
✅ Internal linking — setiap soal link ke 3-5 soal serupa
✅ Breadcrumb — Beranda > CPNS > TWK > Wawasan Kebangsaan > Soal ini
```

---

## 9. Internal Linking & Domain Authority Strategy

```
soal.nagih.app ──(CTA links)──→ nagih.app
                                 ↑ domain authority mengalir
```

Setiap halaman memiliki satu CTA utama ke `nagih.app`. Contoh CTA:

> *"Sudah paham materinya? Uji kemampuan kamu dengan 500+ soal CPNS di Nagih — gratis untuk paket dasar."*

Nagih.app juga perlu menambahkan link ke `soal.nagih.app` (misalnya di footer atau halaman kategori) untuk memperkuat koneksi dua arah.

---

## 10. Keputusan yang Masih Terbuka

| Keputusan | Status | Impact |
|---|---|---|
| Apakah semua soal boleh publik di SEO site? | Belum diputuskan | Menentukan kapan Fase 2 bisa jalan |
| Admin API endpoint khusus untuk SEO build | Perlu dibuat di backend | Blocker untuk Fase 2 |
| Cron rebuild frequency | Belum ditentukan | Recommended: setiap malam |
| Apakah `pembahasan_enriched` tampil di app juga? | Perlu keputusan produk | Jika ya, user app juga benefit |

---

## 11. Phased Rollout

```
Minggu 1-2:  Setup repo Astro, deploy Fase 1 (halaman kategori + topik manual)
Minggu 3-4:  AI enrichment batch Fase 1 + 2 (soal kosong + kategori populer)
Bulan 2:     Launch Fase 2 — auto-generate halaman soal dari API
Bulan 3+:    Monitor Google Search Console, optimasi berdasarkan data
```

---

## 12. Success Metrics

- Google Search Console: impressions soal-spesifik queries dalam 3 bulan
- Organic sessions dari `soal.nagih.app` ke `nagih.app` (via UTM)
- Registrasi baru yang berasal dari `soal.nagih.app`
- Jumlah halaman terindex di Google (target: >80% dari total halaman)
