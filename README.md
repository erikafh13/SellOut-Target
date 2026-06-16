# Sell-Out Monitor & Target Distribution Dashboard

Dashboard Vue 3 untuk analisis sell-out dan distribusi target per brand → dealer → kategori → SKU.

## Cara Menjalankan

### 1. Install dependencies

```bash
npm install
```

### 2. Jalankan development server

```bash
npm run dev
```

Buka browser di: `http://localhost:5173`

### 3. Build untuk production

```bash
npm run build
```

---

## Cara Pakai

### Input Data (Halaman /input)

Ada 4 langkah input data:

#### 1. SO Historis (lokal)
- Upload file Excel/CSV data sell-out Jan 2024 – Apr 2026
- Kolom yang dibutuhkan:
  ```
  No. Faktur | Tgl Faktur | Bulan | Tahun | Nama Pelanggan |
  No. Barang | BRAND Barang | Kategori | Nama Barang |
  Qty | Jumlah | Sales | Dept. | Nama Dept. |
  Lokasi Toko Pelanggan | City | Category | Market Place
  ```
- Kolom `Sumber Data` otomatis diabaikan

#### 2. Data Target (lokal)
- Upload file Excel/CSV atau input manual
- Format file:
  ```
  brand        | Target
  Logitech     | 4000000000
  Xiaomi       | 4200000000
  ```

#### 3. Pilih Bulan Target
- Pilih bulan dan tahun target (misal: MEI 2026)
- Sistem otomatis menggunakan 12 bulan historis **sebelum** bulan tersebut
- Contoh: target MEI 2026 → historis MEI 2025 – APR 2026

#### 4. SO Berjalan
- **Google Drive**: Upload `credentials.json` service account → pilih file dari folder Penjualan
- **Upload Lokal**: Upload file dengan format yang sama (tanpa kolom Sumber Data)
- Format SO berjalan otomatis dinormalisasi sama seperti historis

---

## Logika Distribusi Target

1. **Brand → Dealer**: berdasarkan % kontribusi omset 12 bulan historis
2. **Dealer → Kategori**: % kontribusi kategori di dealer tersebut
3. **Kategori → SKU**: % kontribusi SKU di kategori tersebut

Metode: **Simple Average** — rata-rata persentase kontribusi per bulan (bukan total akumulasi).

---

## Status Achievement

| Status | Range | Warna |
|--------|-------|-------|
| Melebihi Target | ≥ 115% | Ungu |
| Capai Target | 100% – 114% | Hijau |
| Hampir Capai | 80% – 99% | Kuning |
| Di Bawah Target | < 80% | Merah |

---

## Setup Google Drive (Service Account)

1. Buat Service Account di Google Cloud Console
2. Aktifkan Google Drive API
3. Download credentials JSON
4. Share folder Google Drive ke email service account (Viewer cukup)
5. Upload credentials.json di panel Drive → aplikasi langsung terhubung

> **Catatan**: Semua autentikasi terjadi di browser menggunakan Web Crypto API. Credentials tidak dikirim ke server manapun selain Google API langsung.

---

## Struktur Project

```
src/
├── assets/css/global.css    # Design system & global styles
├── components/
│   └── DrivePanel.vue       # Koneksi Google Drive
├── stores/
│   └── sellout.js           # Pinia state management
├── utils/
│   ├── calculations.js      # Logika distribusi target & achievement
│   ├── fileReader.js        # Baca file lokal (Excel/CSV)
│   └── gdrive.js            # Koneksi Google Drive API
├── views/
│   ├── InputData.vue        # Halaman input 4 sumber data
│   └── Dashboard.vue        # Halaman analisis drill-down
├── router/index.js
├── App.vue
└── main.js
```
