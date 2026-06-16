// utils/brandCleaner.js
const BRAND_MAP = {
  // Trailing spaces
  'ACER ':'ACER','ANKER ':'ANKER','BRATECK ':'BRATECK','DAHUA ':'DAHUA',
  'EPSON ':'EPSON','FANTECH ':'FANTECH','GAMEN ':'GAMEN','HIKVISION ':'HIKVISION',
  'HP ':'HP','INTEL ':'INTEL','KINGSTON ':'KINGSTON','LENOVO ':'LENOVO',
  'LOGITECH ':'LOGITECH','MSI ':'MSI','NYK NEMESIS ':'NYK NEMESIS',
  'PANORAMA ':'PANORAMA','PATRIOT ':'PATRIOT','SAMSUNG ':'SAMSUNG',
  'SONY ':'SONY','UBIQUITI ':'UBIQUITI','UGREEN ':'UGREEN','VENTION ':'VENTION',
  // Case variants
  'Anker':'ANKER','Brateck':'BRATECK','DeepCool':'DEEPCOOL','DarkFlash':'DARKFLASH',
  'Genius':'GENIUS','Gigabyte':'GIGABYTE','Kassen':'KASSEN','Kingston':'KINGSTON',
  'Lenovo':'LENOVO','Logitech':'LOGITECH','Patriot':'PATRIOT','Ripjaws':'RIPJAWS',
  'Sony':'SONY','Tecware':'TECWARE','Ugreen':'UGREEN','UGreen':'UGREEN',
  'Viewsonic':'VIEWSONIC','Xiaomi':'XIAOMI','Asus':'ASUS','Acer':'ACER',
  // Brand aliases
  'ANKER':'ANKER','EPSON':'EPSON','GENIUS':'GENIUS','INTEL':'INTEL',
  'LOGITECH':'LOGITECH','MSI':'MSI','NYK NEMESIS':'NYK NEMESIS','SONY':'SONY',
  'TPLINK':'TPLINK','TP-LINK':'TPLINK','TPLink':'TPLINK',
  'UGREEN':'UGREEN','VENTION':'VENTION',
  'WD':'WD','WD GREEN':'WD',
  'XIAOMI':'XIAOMI','XIOMI':'XIAOMI',
  'MERCUCYS':'MERCUSYS',
  // Other normalizations
  'ASUSA':'ASUS','RUIJI':'RUIJIE','ONY':'SONY',
  'MasterLiquid':'COOLER MASTER','MASTERBOX':'COOLER MASTER',
  'G. Skill Trident':'GSKILL','Soundcore (Anker)':'SOUNDCORE',
  'SOUNDCORE (ANKER)':'SOUNDCORE','TRIDENT':'TRIDENT','Trindent':'TRIDENT',
  'SecureBox ':'SECUREBOX','SECUREBOK':'SECUREBOX',
  'M-TECH':'MTECH',
  '(blank)':null,'':'null',
}

export function cleanBrand(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s || s === '(blank)') return null
  if (s in BRAND_MAP) {
    const mapped = BRAND_MAP[s]
    return mapped === 'null' ? null : mapped
  }
  return s.toUpperCase()
}

// ── Mapping Nama Pelanggan → Nama Toko ───────────────────────────────────────
// Shopee: dipecah per toko berdasarkan nama pelanggan
// Tokopedia: dipecah per toko berdasarkan nama pelanggan
// Website/Retail: berdasarkan prefix No. Faktur
// Sisanya: nama asli pelanggan

// Urutan penting — lebih spesifik di atas, lebih umum di bawah
const SHOPEE_MAP = [
  // Nama pelanggan (uppercase)  →  Nama toko
  { match: nama => nama === 'D - SHOPEE',                           toko: 'Shopee SMG'          },
  { match: nama => nama === 'F - SHOPEE',                           toko: 'Shopee MLG'          },
  { match: nama => nama === 'SHOPEE - WD',                          toko: 'Shopee WD'           },
  { match: nama => nama === 'AIRPAY - MONITORZONE',                 toko: 'Shopee Monitor Zone' },
  { match: nama => nama === 'E - SHOPEE',                           toko: 'Shopee JOG'          },
  { match: nama => nama === 'AIRPAY INTERNATIONAL INDONESIA',       toko: 'Shopee DB Klik Mall' },
  { match: nama => nama === 'AIRPAY.ID',                            toko: 'Shopee JKT'          },
  // Fallback: hanya untuk Airpay yang tidak ter-mapping (Shopee variants
  // akan fall-through ke nama asli jika tidak ada di atas)
  { match: nama => nama.includes('AIRPAY'), toko: 'Shopee' },
]

const TOKPED_MAP = [
  { match: nama => nama === 'TOKOPEDIA',    toko: 'Tokopedia Indonesia' },
  { match: nama => nama === 'TOKOPEDIA.ID', toko: 'Tokopedia Jakarta'   },
  // Fallback
  { match: nama => nama.includes('TOKOPEDIA') || nama.includes('TOKPED'), toko: 'Tokopedia' },
]

export function cleanPelanggan(row) {
  const rawNama = String(row['Nama Pelanggan'] ?? '').trim()
  const nama    = rawNama.toUpperCase()
  const noFaktur = String(row['No. Faktur'] ?? '').trim().toUpperCase()

  // Cek Shopee dulu (lebih spesifik)
  for (const entry of SHOPEE_MAP) {
    if (entry.match(nama)) {
      console.log('[cleanPelanggan]', rawNama, '=> SHOPEE MAP =>', entry.toko)
      return entry.toko
    }
  }

  // Cek Tokopedia
  for (const entry of TOKPED_MAP) {
    if (entry.match(nama)) {
      console.log('[cleanPelanggan]', rawNama, '=> TOKPED MAP =>', entry.toko)
      return entry.toko
    }
  }

  // Website / Retail (berdasarkan prefix No. Faktur)
  const retailPrefixes = ['AO','BO','DO','EO','FO','HO']
  if (retailPrefixes.some(p => noFaktur.startsWith(p))) {
    console.log('[cleanPelanggan]', rawNama, '=> RETAIL')
    return 'WEBSITE / RETAIL'
  }

  // Nama asli kalau tidak cocok semua
  console.log('[cleanPelanggan]', rawNama, '=> NAMA ASLI:', rawNama)
  return rawNama
}

// Helper: cek apakah pelanggan adalah platform online
export function getPlatformGroup(namaPelanggan) {
  const n = String(namaPelanggan ?? '').toUpperCase()
  console.log('[getPlatformGroup] input:', namaPelanggan, '=>', n)
  if (n.startsWith('SHOPEE') || n.includes('SHOPEE')) { console.log('[getPlatformGroup] => Shopee'); return 'Shopee' }
  if (n.startsWith('TOKOPEDIA') || n.includes('TOKOPEDIA')) { console.log('[getPlatformGroup] => Tokopedia'); return 'Tokopedia' }
  if (n === 'WEBSITE / RETAIL') { console.log('[getPlatformGroup] => Website/Retail'); return 'Website/Retail' }
  console.log('[getPlatformGroup] => Offline/Dealer')
  return 'Offline/Dealer'
}