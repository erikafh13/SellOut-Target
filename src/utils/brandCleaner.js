// utils/brandCleaner.js
// Normalisasi nama brand dan nama pelanggan.
// File ini adalah satu-satunya sumber kebenaran untuk kedua fungsi tersebut —
// calculations.js me-re-export cleanPelanggan supaya import lama tetap jalan.

const BRAND_MAP = {
  // Varian huruf besar/kecil
  ANKER: 'ANKER', BRATECK: 'BRATECK', DEEPCOOL: 'DEEPCOOL', DARKFLASH: 'DARKFLASH',
  GENIUS: 'GENIUS', GIGABYTE: 'GIGABYTE', KASSEN: 'KASSEN', KINGSTON: 'KINGSTON',
  LENOVO: 'LENOVO', LOGITECH: 'LOGITECH', PATRIOT: 'PATRIOT', RIPJAWS: 'RIPJAWS',
  SONY: 'SONY', TECWARE: 'TECWARE', UGREEN: 'UGREEN', VIEWSONIC: 'VIEWSONIC',
  XIAOMI: 'XIAOMI', ASUS: 'ASUS', ACER: 'ACER',

  // Alias dan salah ketik
  'TP-LINK': 'TPLINK', TPLINK: 'TPLINK',
  'WD GREEN': 'WD',
  XIOMI: 'XIAOMI',
  MERCUCYS: 'MERCUSYS',
  ASUSA: 'ASUS',
  RUIJI: 'RUIJIE',
  ONY: 'SONY',
  MASTERLIQUID: 'COOLER MASTER', MASTERBOX: 'COOLER MASTER',
  'G. SKILL TRIDENT': 'GSKILL',
  'SOUNDCORE (ANKER)': 'SOUNDCORE',
  TRINDENT: 'TRIDENT',
  SECUREBOK: 'SECUREBOX',
  'M-TECH': 'MTECH',
}

/**
 * Normalisasi nama brand ke bentuk kanonik (huruf besar).
 * Mengembalikan null untuk nilai kosong atau '(blank)'.
 *
 * Perbaikan dari versi lama: dulu spasi berlebih dan variasi huruf besar/kecil
 * ditangani lewat entri terpisah per brand ('ACER ', 'Acer', 'ACER'), sehingga
 * brand baru selalu lolos dari mapping. Sekarang input dinormalisasi dulu
 * (trim + uppercase + rapatkan spasi ganda) baru dicocokkan, jadi peta ini
 * hanya perlu memuat alias yang benar-benar berbeda.
 */
export function cleanBrand(raw) {
  if (raw == null) return null
  const s = String(raw).trim().replace(/\s+/g, ' ').toUpperCase()
  if (!s || s === '(BLANK)') return null
  return BRAND_MAP[s] ?? s
}

// ── Nama pelanggan → nama toko ───────────────────────────────────────────────
// Urutan penting: aturan spesifik di atas, aturan umum di bawah.

const TOKO_MAP = [
  { match: n => n === 'D - SHOPEE',                     toko: 'Shopee SMG' },
  { match: n => n === 'F - SHOPEE',                     toko: 'Shopee MLG' },
  { match: n => n === 'E - SHOPEE',                     toko: 'Shopee JOG' },
  { match: n => n === 'SHOPEE - WD',                    toko: 'Shopee WD' },
  { match: n => n === 'AIRPAY - MONITORZONE',           toko: 'Shopee Monitor Zone' },
  { match: n => n === 'AIRPAY INTERNATIONAL INDONESIA', toko: 'Shopee DB Klik Mall' },
  { match: n => n === 'AIRPAY.ID',                      toko: 'Shopee JKT' },
  { match: n => n.includes('AIRPAY'),                   toko: 'Shopee' },
  { match: n => n === 'TOKOPEDIA',                      toko: 'Tokopedia Indonesia' },
  { match: n => n === 'TOKOPEDIA.ID',                   toko: 'Tokopedia Jakarta' },
  { match: n => n.includes('TOKOPEDIA') || n.includes('TOKPED'), toko: 'Tokopedia' },
]

const RETAIL_PREFIXES = ['AO', 'BO', 'DO', 'EO', 'FO', 'HO']

/**
 * Kelompokkan baris SO ke nama dealer/toko yang dipakai di seluruh dashboard.
 *
 * PENTING: fungsi ini adalah kunci pengelompokan dealer di mana-mana —
 * distribusi target, perhitungan achievement, pivot, dan filter platform.
 * Semuanya harus memakai fungsi yang sama, kalau tidak target dan realisasi
 * akan jatuh ke baris yang berbeda.
 */
export function cleanPelanggan(row) {
  const rawNama = String(row['Nama Pelanggan'] ?? '').trim()
  const nama = rawNama.toUpperCase()

  for (const entry of TOKO_MAP) {
    if (entry.match(nama)) return entry.toko
  }

  const noFaktur = String(row['No. Faktur'] ?? '').trim().toUpperCase()
  if (RETAIL_PREFIXES.some(p => noFaktur.startsWith(p))) return 'WEBSITE / RETAIL'

  return rawNama
}

/** Kelompok platform untuk filter di dashboard. */
export function getPlatformGroup(namaPelanggan) {
  const n = String(namaPelanggan ?? '').toUpperCase()
  if (n.includes('SHOPEE')) return 'Shopee'
  if (n.includes('TOKOPEDIA')) return 'Tokopedia'
  if (n === 'WEBSITE / RETAIL') return 'Website/Retail'
  return 'Offline/Dealer'
}
