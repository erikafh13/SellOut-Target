// utils/calculations.js
// Logika perhitungan target, distribusi, dan achievement.

import { cleanBrand, cleanPelanggan } from './brandCleaner'

// Re-export supaya import lama `from '@/utils/calculations'` tetap jalan.
// Implementasinya hanya ada satu, di brandCleaner.js.
export { cleanPelanggan }

export const BULAN_INDONESIA = {
  1: 'JANUARI', 2: 'FEBRUARI', 3: 'MARET', 4: 'APRIL',
  5: 'MEI', 6: 'JUNI', 7: 'JULI', 8: 'AGUSTUS',
  9: 'SEPTEMBER', 10: 'OKTOBER', 11: 'NOVEMBER', 12: 'DESEMBER',
}
export const BULAN_ORDER = Object.values(BULAN_INDONESIA)

const BULAN_NOMOR = Object.fromEntries(
  Object.entries(BULAN_INDONESIA).map(([n, nama]) => [nama, Number(n)])
)

// Lantai pertumbuhan: brand yang trennya datar atau menurun tetap
// mendapat target naik sebesar angka ini.
export const GROWTH_FLOOR_PCT = 10

// ── Format & parsing ────────────────────────────────────────────────────────

export function formatRupiah(val) {
  if (val == null || isNaN(val)) return 'Rp 0'
  return 'Rp ' + Math.round(val).toLocaleString('id-ID')
}

export function formatPersen(val, d = 1) {
  if (val == null || isNaN(val)) return '0%'
  return val.toFixed(d) + '%'
}

/**
 * Parse angka dari berbagai format: 1.234.567 / 1,234,567 / 1234567,89 / "Rp 1.234"
 * Menebak pemisah desimal dari posisi dan panjang grup terakhir.
 */
export function parseRupiah(str) {
  if (typeof str === 'number') return isNaN(str) ? 0 : str
  if (str == null) return 0

  const s = String(str).replace(/[^0-9,.-]/g, '')
  if (!s) return 0

  const punyaTitik = s.includes('.')
  const punyaKoma = s.includes(',')

  if (punyaTitik && punyaKoma) {
    // Pemisah desimal adalah yang muncul paling akhir
    return s.lastIndexOf('.') > s.lastIndexOf(',')
      ? parseFloat(s.replace(/,/g, '')) || 0
      : parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  }

  const sep = punyaKoma ? ',' : (punyaTitik ? '.' : null)
  if (!sep) return parseFloat(s) || 0

  const parts = s.split(sep)
  // Lebih dari satu pemisah, atau grup terakhir tepat 3 digit → pemisah ribuan
  if (parts.length > 2 || parts[parts.length - 1].length === 3) {
    return parseFloat(parts.join('')) || 0
  }
  return parseFloat(parts.join('.')) || 0
}

/** Ambil nilai omset dari satu baris SO. */
function nilaiOmset(row) {
  return parseRupiah(row['Total'] ?? row['Jumlah']) || 0
}

// ── Mapping departemen & kota ───────────────────────────────────────────────

export function mapNamaDept(row) {
  const dept = String(row['Dept.'] ?? '').trim().toUpperCase()
  const pelanggan = String(row['Nama Pelanggan'] ?? '').trim().toUpperCase()

  if (dept === 'A') {
    const itc = ['A - CASH', 'AIRPAY INTERNATIONAL INDONESIA', 'TOKOPEDIA']
    return itc.includes(pelanggan) ? 'A - ITC' : 'A - RETAIL'
  }

  return {
    B: 'B - JKT', C: 'C - PUSAT', D: 'D - SMG', E: 'E - JOG',
    F: 'F - MLG', G: 'G - PROJECT', H: 'H - BALI', X: 'X',
  }[dept] ?? 'X'
}

const CITY_MAP = {
  'A - ITC': 'Surabaya', 'A - RETAIL': 'Surabaya',
  'C - PUSAT': 'Surabaya', 'G - PROJECT': 'Surabaya',
  'B - JKT': 'Jakarta', 'D - SMG': 'Semarang',
  'E - JOG': 'Jogja', 'F - MLG': 'Malang',
  'H - BALI': 'Bali',
}

export function mapCity(namaDept) {
  return CITY_MAP[namaDept] ?? 'Others'
}

// ── Status achievement ──────────────────────────────────────────────────────

export function getAchievementStatus(pct) {
  if (pct >= 115) return { label: 'Melebihi Target', cls: 'tag-purple', color: '#c084fc' }
  if (pct >= 100) return { label: 'Capai Target',    cls: 'tag-green',  color: '#4ade80' }
  if (pct >= 80)  return { label: 'Hampir Capai',    cls: 'tag-yellow', color: '#fbbf24' }
  return            { label: 'Di Bawah Target',      cls: 'tag-red',    color: '#f87171' }
}

// ── Periode historis ────────────────────────────────────────────────────────

/** N bulan sebelum bulan target, urut kronologis (paling lama → terbaru). */
export function getNBulanHistoris(targetBulan, targetTahun, n) {
  const result = []
  let m = Number(targetBulan) - 1
  let y = Number(targetTahun)
  for (let i = 0; i < n; i++) {
    if (m < 1) { m = 12; y-- }
    result.unshift({ bulan: BULAN_INDONESIA[m], tahun: y })
    m--
  }
  return result
}

export const get3BulanHistoris  = (b, t) => getNBulanHistoris(b, t, 3)
export const get12BulanHistoris = (b, t) => getNBulanHistoris(b, t, 12)

const periodeKey = (bulan, tahun) => `${String(bulan ?? '').toUpperCase()}-${tahun}`
const rowKey = row => periodeKey(row['Bulan'], row['Tahun'])

function urutanBulan(bulan, tahun) {
  const n = BULAN_NOMOR[String(bulan ?? '').toUpperCase()]
  return n ? Number(tahun) * 12 + n : null
}

/**
 * Periode historis yang benar-benar tersedia di data, urut kronologis.
 *
 * Panjangnya menyesuaikan jumlah data sell-out yang ada — kalau data cuma
 * 5 bulan, yang dipakai 5 bulan; kalau 24 bulan, dipakai 24-nya. Hanya bulan
 * sebelum bulan target yang diambil.
 */
export function getPeriodeHistoris(rows, targetBulan, targetTahun) {
  const batas = urutanBulan(BULAN_INDONESIA[Number(targetBulan)], targetTahun)
  if (!batas) return []

  const unik = new Map()
  for (const row of rows) {
    const bulan = String(row['Bulan'] ?? '').toUpperCase()
    const tahun = Number(row['Tahun'])
    const urut = urutanBulan(bulan, tahun)
    if (!urut || urut >= batas) continue
    unik.set(urut, { bulan, tahun, urut })
  }

  return [...unik.values()].sort((a, b) => a.urut - b.urut)
}

/** Baris SO yang masuk periode historis (semua bulan tersedia sebelum bulan target). */
export function filterHistoris(rows, targetBulan, targetTahun) {
  const periode = getPeriodeHistoris(rows, targetBulan, targetTahun)
  const keys = new Set(periode.map(p => periodeKey(p.bulan, p.tahun)))
  return rows.filter(r => keys.has(rowKey(r)))
}

// ── Target per brand ────────────────────────────────────────────────────────

/**
 * Target per brand dari rata-rata pertumbuhan bulanan.
 *
 *   gr[i]  = omset[i] / omset[i-1] - 1
 *   growth = rata-rata seluruh gr[i]
 *   growth = max(growth, lantai)
 *   target = omset bulan terakhir x (1 + growth)
 *
 * Bulan tanpa penjualan dilewati: tidak dihitung sebagai -100%, dan bulan
 * sesudahnya tidak dihitung sebagai lonjakan dari nol. Brand yang stoknya
 * sempat kosong tidak dihukum karenanya.
 */
export function hitungTargetOtomatis(rows, targetBulan, targetTahun, opts = {}) {
  const floorPct = opts.floorPct ?? GROWTH_FLOOR_PCT

  const periode = getPeriodeHistoris(rows, targetBulan, targetTahun)
  if (!periode.length) return []

  const posisi = new Map(periode.map((p, i) => [periodeKey(p.bulan, p.tahun), i]))

  // brand → deret omset per bulan, index 0 = bulan paling lama
  const deret = {}
  for (const row of rows) {
    const i = posisi.get(rowKey(row))
    if (i === undefined) continue

    const brand = cleanBrand(row['Brand'] ?? row['BRAND Barang'])
    if (!brand) continue

    if (!deret[brand]) deret[brand] = new Array(periode.length).fill(0)
    deret[brand][i] += nilaiOmset(row)
  }

  const result = []
  for (const [brand, seri] of Object.entries(deret)) {
    const growths = []
    let prev = null
    for (const nilai of seri) {
      if (nilai <= 0) { prev = null; continue }
      if (prev !== null) growths.push((nilai / prev - 1) * 100)
      prev = nilai
    }

    // Basis proyeksi: bulan terakhir yang ada penjualannya
    let omsetTerakhir = 0
    for (let i = seri.length - 1; i >= 0; i--) {
      if (seri[i] > 0) { omsetTerakhir = seri[i]; break }
    }
    if (omsetTerakhir <= 0) continue

    const bulanAktif = seri.filter(v => v > 0).length
    const avgBulanan = seri.reduce((a, b) => a + b, 0) / bulanAktif

    // Brand yang cuma punya satu bulan data tidak punya gr[i] sama sekali
    const growthRaw = growths.length
      ? growths.reduce((a, b) => a + b, 0) / growths.length
      : 0
    const growthPct = Math.max(growthRaw, floorPct)

    result.push({
      brand,
      target:        Math.round(omsetTerakhir * (1 + growthPct / 100)),
      growthPct:     Number(growthPct.toFixed(2)),
      growthRaw:     Number(growthRaw.toFixed(2)),
      kenaLantai:    growthRaw < floorPct,
      omsetTerakhir: Math.round(omsetTerakhir),
      avgBulanan:    Math.round(avgBulanan),
      bulanAktif,
      bulanHistoris: periode.length,
    })
  }

  return result.sort((a, b) => b.target - a.target)
}

// ── Distribusi target ───────────────────────────────────────────────────────

/**
 * Rata-rata persentase kontribusi tiap grup, dihitung per bulan lalu
 * dirata-ratakan (simple average), bukan dari total akumulasi.
 * Hasilnya dinormalisasi supaya berjumlah 100%.
 */
function hitungPctPerBulan(rows, getKey, getExtra = null) {
  const perBulan = {}
  for (const row of rows) {
    const grp = getKey(row)
    if (!grp) continue

    const bulan = rowKey(row)
    if (!perBulan[bulan]) perBulan[bulan] = {}
    if (!perBulan[bulan][grp]) {
      perBulan[bulan][grp] = { val: 0, extra: getExtra ? getExtra(row) : null }
    }
    perBulan[bulan][grp].val += nilaiOmset(row)
  }

  const kumpulan = {}
  for (const grpMap of Object.values(perBulan)) {
    const total = Object.values(grpMap).reduce((a, b) => a + b.val, 0)
    if (!total) continue
    for (const [grp, { val, extra }] of Object.entries(grpMap)) {
      if (!kumpulan[grp]) kumpulan[grp] = { pcts: [], extra }
      if (extra && !kumpulan[grp].extra) kumpulan[grp].extra = extra
      kumpulan[grp].pcts.push((val / total) * 100)
    }
  }

  const result = {}
  for (const [grp, { pcts, extra }] of Object.entries(kumpulan)) {
    result[grp] = { pct: pcts.reduce((a, b) => a + b, 0) / pcts.length, extra }
  }

  const totalPct = Object.values(result).reduce((a, b) => a + b.pct, 0)
  if (totalPct > 0) {
    for (const g of Object.keys(result)) result[g].pct = (result[g].pct / totalPct) * 100
  }
  return result
}

const getKategori = row => String(row['Kategori'] ?? '').trim()
const getSku      = row => String(row['SKU'] ?? row['No. Barang'] ?? '').trim()
const getNamaItem = row => String(row['Nama Item'] ?? row['Nama Barang'] ?? '').trim()

function baris1Brand(rows, brand) {
  const target = String(brand).toUpperCase()
  return rows.filter(r => {
    const b = cleanBrand(r['Brand'] ?? r['BRAND Barang'])
    return b && b.toUpperCase() === target
  })
}

/**
 * Bagi target brand ke dealer → kategori → SKU berdasarkan kontribusi historis.
 *
 * Perbaikan penting dari versi lama: pengelompokan dealer memakai
 * cleanPelanggan(), sama seperti hitungAchievement(). Versi lama memakai
 * kolom 'Nama Pelanggan' mentah di sini tapi cleanPelanggan() di sana, jadi
 * untuk semua dealer marketplace dan retail, target dan realisasi jatuh ke
 * baris berbeda — target muncul tanpa realisasi, realisasi muncul tanpa target.
 */
export function distribusiTarget(historisRows, targetBrand, brand) {
  const rowsBrand = baris1Brand(historisRows, brand)
  const pctDealer = hitungPctPerBulan(rowsBrand, cleanPelanggan)

  const result = {}
  for (const [dealer, { pct }] of Object.entries(pctDealer)) {
    const targetDealer = (pct / 100) * targetBrand
    result[dealer] = { pct, target: targetDealer, kategori: {} }

    const rowsDealer = rowsBrand.filter(r => cleanPelanggan(r) === dealer)
    const pctKat = hitungPctPerBulan(rowsDealer, getKategori)

    for (const [kat, dataKat] of Object.entries(pctKat)) {
      const targetKat = (dataKat.pct / 100) * targetDealer
      result[dealer].kategori[kat] = { pct: dataKat.pct, target: targetKat, sku: {} }

      const rowsKat = rowsDealer.filter(r => getKategori(r) === kat)
      const pctSku = hitungPctPerBulan(rowsKat, getSku, getNamaItem)

      for (const [skuCode, dataSku] of Object.entries(pctSku)) {
        result[dealer].kategori[kat].sku[skuCode] = {
          pct: dataSku.pct,
          target: (dataSku.pct / 100) * targetKat,
          namaItem: dataSku.extra ?? '',
        }
      }
    }
  }
  return result
}

// ── Achievement ─────────────────────────────────────────────────────────────

/** Kumpulkan realisasi per dealer → kategori → SKU untuk satu brand. */
function kumpulkanRealisasi(rows, brand) {
  const real = {}
  for (const row of baris1Brand(rows, brand)) {
    const dealer = cleanPelanggan(row)
    const kat = getKategori(row)
    const sku = getSku(row)
    const jml = nilaiOmset(row)

    if (!real[dealer]) real[dealer] = { total: 0, kategori: {} }
    real[dealer].total += jml

    if (!real[dealer].kategori[kat]) real[dealer].kategori[kat] = { total: 0, sku: {} }
    real[dealer].kategori[kat].total += jml
    real[dealer].kategori[kat].sku[sku] = (real[dealer].kategori[kat].sku[sku] ?? 0) + jml
  }
  return real
}

const persen = (real, target) => (target > 0 ? (real / target) * 100 : 0)

export function hitungAchievement(soberjalanRows, distribusi, brand) {
  const real = kumpulkanRealisasi(soberjalanRows, brand)
  const result = {}

  for (const [dealer, info] of Object.entries(distribusi)) {
    const realDealer = real[dealer]?.total ?? 0
    const achDealer = persen(realDealer, info.target)

    result[dealer] = {
      target: info.target,
      pct: info.pct,
      realization: realDealer,
      achievement: achDealer,
      status: getAchievementStatus(achDealer),
      kategori: {},
    }

    for (const [kat, ki] of Object.entries(info.kategori)) {
      const realKat = real[dealer]?.kategori[kat]?.total ?? 0
      const achKat = persen(realKat, ki.target)

      result[dealer].kategori[kat] = {
        target: ki.target,
        pct: ki.pct,
        realization: realKat,
        achievement: achKat,
        status: getAchievementStatus(achKat),
        sku: {},
      }

      for (const [skuNo, si] of Object.entries(ki.sku)) {
        const realSku = real[dealer]?.kategori[kat]?.sku[skuNo] ?? 0
        const achSku = persen(realSku, si.target)

        result[dealer].kategori[kat].sku[skuNo] = {
          namaItem: si.namaItem ?? si.namaBarang ?? '',
          target: si.target,
          pct: si.pct,
          realization: realSku,
          achievement: achSku,
          status: getAchievementStatus(achSku),
        }
      }
    }
  }
  return result
}
