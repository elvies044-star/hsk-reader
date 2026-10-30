# 五十天中文精读 · 50 Hari Membaca Mandarin (HSK 8–9)

50 teks bacaan Mandarin faktual tingkat HSK 8–9, satu teks per hari (31 Okt – 19 Des 2026).
Topiknya campuran sejarah dan budaya Tiongkok serta teknologi masa kini: AI dan model bahasa besar, chip, mobil listrik dan nikel Indonesia, 5G, CRISPR, vaksin mRNA, kereta cepat Whoosh, eksplorasi bulan, dan lain-lain.

## Fitur
- **Ketuk sebuah kata** → muncul pinyin, arti dalam bahasa Indonesia, dan tombol untuk menerjemahkan seluruh kalimat.
- **Blok beberapa kata atau kalimat** (seret dengan mouse, atau tekan lama di HP) → muncul pinyin dan terjemahan bagian yang diblok.
- **🔊 Dengarkan** → dibacakan dengan suara Mandarin dari perangkat.
- Tombol **拼音** → menampilkan pinyin di atas semua karakter.
- **A− / A+** → mengatur ukuran huruf.
- Kata bergaris titik adalah kosakata penting; artinya diambil dari tabel kosakata yang ditulis sendiri.
- Tombol **Tandai selesai** untuk mencatat progres (tersimpan di browser masing-masing).
- Versi cetak: `Bacaan_Mandarin_HSK8-9_50_Hari.pdf` (atau buka `cetak.html` lalu Print → Save as PDF).

## Cara upload ke GitHub dan menjadikannya website (GitHub Pages)
1. Buat repositori baru di GitHub, misalnya `hsk-reader` (pilih **Public**).
2. Klik **Add file → Upload files**, lalu seret **seluruh file** di folder ini. Klik **Commit changes**.
3. Buka **Settings → Pages**. Di bagian *Source* pilih **Deploy from a branch**, branch **main**, folder **/ (root)**, lalu **Save**.
4. Tunggu 1–2 menit. Website akan aktif di `https://<username>.github.io/hsk-reader/`.

## Catatan teknis
- Pinyin dibuat di browser dengan pustaka [pinyin-pro](https://github.com/zh-lx/pinyin-pro) (dimuat dari CDN jsDelivr). Sesekali nada untuk karakter berbunyi ganda (多音字) bisa kurang tepat.
- Terjemahan selain tabel kosakata memakai layanan terjemahan mesin online (endpoint publik Google Translate, cadangannya MyMemory). Fitur ini butuh internet, hasilnya tidak selalu sempurna, dan teks yang diketuk/diblok dikirim ke layanan tersebut.
- Pemisahan kata memakai `Intl.Segmenter` bawaan browser (Chrome, Edge, Safari, dan Firefox versi baru).
- Untuk menambah atau mengubah teks, edit file `texts-1.js`, `texts-2.js`, atau `texts-3.js`. Format tiap teks: `t` (judul), `id` (topik dalam bahasa Indonesia), `p` (isi; paragraf dipisah baris kosong), `v` (kosakata: `[kata, pinyin, arti]`), `q` (pertanyaan).

## Struktur
```
index.html          halaman utama + pembaca
cetak.html          versi cetak (untuk membuat PDF)
style.css
app.js
texts-1.js     hari 1–20
texts-2.js     hari 21–36
texts-3.js     hari 37–50
Bacaan_Mandarin_HSK8-9_50_Hari.pdf
```
