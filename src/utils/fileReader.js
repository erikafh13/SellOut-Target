// utils/fileReader.js
import * as XLSX from 'xlsx'
import { parseRupiah, mapNamaDept, mapCity, BULAN_INDONESIA } from './calculations'

export function readFileAsBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsArrayBuffer(file)
  })
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsText(file, 'UTF-8')
  })
}

export function parseExcelOrCsv(buffer, fileName, options = {}) {
  const wb = XLSX.read(buffer, { type: 'array', ...options })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

/**
 * Parser CSV/TSV yang menghormati tanda kutip.
 *
 * Versi lama memakai split() per baris dan per pemisah, sehingga field
 * berkutip yang memuat koma atau baris baru — misalnya "PT ABC, Tbk" —
 * membuat seluruh kolom setelahnya bergeser.
 */
function parseDelimited(text) {
  const sep = text.indexOf('\t') !== -1 && text.indexOf('\t') < text.indexOf('\n')
    ? '\t' : ','

  const baris = []
  let field = ''
  let record = []
  let inQuote = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]

    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuote = false
      } else field += c
      continue
    }

    if (c === '"') { inQuote = true }
    else if (c === sep) { record.push(field); field = '' }
    else if (c === '\n') { record.push(field); baris.push(record); record = []; field = '' }
    else if (c !== '\r') { field += c }
  }
  if (field !== '' || record.length) { record.push(field); baris.push(record) }

  if (!baris.length) return []

  const headers = baris[0].map(h => h.trim())
  return baris.slice(1)
    .filter(r => r.some(v => String(v).trim() !== ''))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? '').trim()])))
}

async function bacaBaris(file) {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return parseDelimited(await readFileAsText(file))
  }
  return parseExcelOrCsv(await readFileAsBuffer(file), file.name)
}

const BULAN_EN = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
}

/**
 * Parse tanggal faktur dari Date, serial Excel, atau berbagai format teks.
 * Format dd/mm/yyyy diperlakukan sebagai hari-bulan-tahun (konvensi Indonesia).
 */
function parseTglFaktur(nilai) {
  if (!nilai && nilai !== 0) return null
  if (nilai instanceof Date) return isNaN(nilai.getTime()) ? null : nilai

  // Serial date Excel (hari sejak 30-12-1899)
  if (typeof nilai === 'number' && nilai > 20000 && nilai < 80000) {
    return new Date(Date.UTC(1899, 11, 30 + nilai))
  }

  const s = String(nilai).trim()
  if (!s) return null

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3])

  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1])

  const teks = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (teks) {
    const bln = BULAN_EN[teks[2].slice(0, 3).toUpperCase()]
    if (bln) return new Date(+teks[3], bln - 1, +teks[1])
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

const teks = v => String(v ?? '').trim()
const angka = v => parseFloat(String(v ?? '0').replace(',', '.')) || 0

/** Baris SO format baru (kolom SKU / Brand / Total / Quantity). */
export function normalizeSoFormatBaru(row) {
  const tgl = parseTglFaktur(row['Tgl Faktur'] ?? row['Tanggal'])
  const bulan = tgl ? BULAN_INDONESIA[tgl.getMonth() + 1] : ''
  const tahun = tgl ? tgl.getFullYear() : 0

  const tglStandard = tgl
    ? `${tgl.getFullYear()}-${String(tgl.getMonth() + 1).padStart(2, '0')}-${String(tgl.getDate()).padStart(2, '0')}`
    : teks(row['Tgl Faktur'] ?? row['Tanggal'])

  // Dulu nilai total dipotong di koma pertama, sehingga "1,234,567" terbaca 1.
  // Sekarang memakai parseRupiah yang sama dengan sisa aplikasi.
  const total = parseRupiah(row['Total'] ?? row['Jumlah'])

  const dept = mapNamaDept(row)
  const kota = mapCity(dept)
  const sku = teks(row['SKU'] ?? row['No. Barang'])
  const brand = teks(row['Brand'] ?? row['BRAND Barang'])
  const nama = teks(row['Nama Item'] ?? row['Nama Barang'])
  const qty = angka(row['Quantity'] ?? row['Qty'])

  return {
    'No. Faktur':            teks(row['No. Faktur']),
    'Tgl Faktur':            tglStandard,
    'Bulan':                 bulan,
    'Tahun':                 tahun,
    'Nama Pelanggan':        teks(row['Nama Pelanggan']),
    'No. Barang':            sku,
    'SKU':                   sku,
    'BRAND Barang':          brand,
    'Brand':                 brand,
    'Kategori':              teks(row['Kategori']),
    'Nama Barang':           nama,
    'Nama Item':             nama,
    'Qty':                   qty,
    'Quantity':              qty,
    'Harga Sat':             parseRupiah(row['Harga Sat']),
    'Jumlah':                total,
    'Total':                 total,
    'Sales':                 teks(row['Sales']),
    'Gudang':                teks(row['Gudang']),
    'Dept.':                 dept,
    'Nama Dept.':            dept,
    'Lokasi Toko Pelanggan': teks(row['Lokasi Toko Pelanggan'] ?? row['Lokasi Toko']),
    'Kota':                  kota,
    'City':                  kota,
    'Kab/Kota':              kota,
    'Status':                teks(row['Status']),
    'Alamat':                '',
    'Kec':                   '',
    'Provinsi':              '',
    'Periode':               bulan && tahun ? `${bulan} ${tahun}` : '',
  }
}

/** Baris SO format lama (kolom BRAND Barang / Kuantitas / Keterangan Barang). */
function normalizeSoHistoris(row) {
  const brand = teks(row['BRAND Barang'])
  const pelanggan = teks(row['Nama Pelanggan'])
  if (!brand && !pelanggan) return null

  const tglRaw = row['Tgl Faktur']
  const tgl = parseTglFaktur(tglRaw)
  const bulan = tgl ? BULAN_INDONESIA[tgl.getMonth() + 1] : teks(row['Bulan']).toUpperCase()
  const tahun = tgl ? tgl.getFullYear() : (parseInt(row['Tahun'], 10) || 0)

  const dept = mapNamaDept(row)
  const kota = mapCity(dept)
  const sku = teks(row['No. Barang'])
  const nama = teks(row['Keterangan Barang'] ?? row['Nama Barang'])
  const qty = angka(row['Kuantitas'] ?? row['Qty'])
  const total = parseRupiah(row['Jumlah'])

  return {
    'No. Faktur':            teks(row['No. Faktur']),
    'Tgl Faktur':            teks(tglRaw),
    'Bulan':                 bulan,
    'Tahun':                 tahun,
    'Nama Pelanggan':        pelanggan,
    'No. Barang':            sku,
    'SKU':                   sku,
    'BRAND Barang':          brand,
    'Brand':                 brand,
    'Kategori':              teks(row['Nama Kategori Barang Barang'] ?? row['Kategori']),
    'Nama Barang':           nama,
    'Nama Item':             nama,
    'Qty':                   qty,
    'Quantity':              qty,
    'Jumlah':                total,
    'Total':                 total,
    'Sales':                 teks(row['Sales']),
    'Dept.':                 dept,
    'Nama Dept.':            dept,
    'Lokasi Toko Pelanggan': teks(row['Lokasi Toko Pelanggan']),
    'Kota':                  kota,
    'City':                  kota,
    'Kab/Kota':              kota,
    'Status':                '',
    'Alamat':                '',
    'Kec':                   '',
    'Provinsi':              '',
    'Periode':               bulan && tahun ? `${bulan} ${tahun}` : '',
  }
}

function detectFormat(rows) {
  if (!rows.length) return 'NEW'
  const keys = Object.keys(rows[0]).map(k => k.trim())
  const punya = k => keys.includes(k)
  return (punya('SKU') || punya('Total') || punya('Quantity') || punya('Brand')) ? 'NEW' : 'OLD'
}

export async function readSoHistoris(files) {
  const daftar = (files instanceof File) ? [files] : Array.from(files)
  const semua = []

  for (const file of daftar) {
    const rows = await bacaBaris(file)
    const normalize = detectFormat(rows) === 'NEW' ? normalizeSoFormatBaru : normalizeSoHistoris

    for (let i = 0; i < rows.length; i++) {
      const hasil = normalize(rows[i])
      if (hasil) semua.push(hasil)
      // Beri napas ke UI thread setiap 10.000 baris
      if (i > 0 && i % 10000 === 0) await new Promise(r => setTimeout(r, 0))
    }
  }

  const seen = new Set()
  const result = []
  for (const r of semua) {
    const key = [r['No. Faktur'], r['SKU'], r['Bulan'], r['Tahun'], r['Nama Pelanggan'], r['Total']].join('|')
    if (!seen.has(key)) { seen.add(key); result.push(r) }
  }
  return result
}

export async function readTarget(file) {
  const rows = await bacaBaris(file)
  return rows.map(r => {
    const keys = Object.keys(r)
    const brandKey = keys.find(k => k.trim().toLowerCase() === 'brand')
    const targetKey = keys.find(k => k.trim().toLowerCase() === 'target')
    return {
      brand: teks(brandKey ? r[brandKey] : ''),
      target: parseRupiah(targetKey ? r[targetKey] : 0),
    }
  }).filter(r => r.brand && r.target > 0)
}

// ── Data distributor ────────────────────────────────────────────────────────

const samakan = s => String(s ?? '').toLowerCase().replace(/[\s./]/g, '')

/**
 * Baca file data distributor.
 * Kolom: Customer No. | Customer Name | Addres | Alamat Google | Provinsi |
 *        Kota/Kabupaten | Kecamatan
 */
export async function readDistributorFile(file) {
  const rows = await bacaBaris(file)

  return rows.map(r => {
    const keys = Object.keys(r)
    const find = (...kandidat) => {
      for (const c of kandidat) {
        const k = keys.find(k => samakan(k) === samakan(c))
        if (k !== undefined) return teks(r[k])
      }
      return ''
    }

    const customerName = find('Customer Name', 'Nama', 'Name')
    if (!customerName) return null

    return {
      customerNo:        find('Customer No.', 'Customer No', 'No', 'ID'),
      customerName,
      customerNameUpper: customerName.toUpperCase(),
      address:           find('Addres', 'Address', 'Alamat', 'Alamat lengkap'),
      alamatGoogle:      find('Alamat Google', 'Google', 'Alamat Google Maps'),
      provinsi:          find('Provinsi', 'Province'),
      kotaKab:           find('Kota/Kabupaten', 'Kota Kabupaten', 'Kota', 'Kabupaten', 'Kab/Kota'),
      kecamatan:         find('Kecamatan', 'Kec', 'District'),
    }
  }).filter(Boolean)
}

const normalizeNameKey = nama => String(nama ?? '').toUpperCase().replace(/\s+/g, ' ').trim()

export function buildDistributorMap(distributorData) {
  const map = new Map()
  for (const d of distributorData) {
    const key = normalizeNameKey(d.customerName)
    if (!key) continue
    map.set(key, {
      alamat:   d.address || d.alamatGoogle || '',
      kec:      d.kecamatan || '',
      kotaKab:  d.kotaKab || '',
      provinsi: d.provinsi || '',
    })
  }
  return map
}

/** Isi kolom lokasi di data SO dari data distributor, dicocokkan per nama pelanggan. */
export function applyDistributorMapping(soRows, distributorMap) {
  let mapped = 0
  const rows = soRows.map(row => {
    const loc = distributorMap.get(normalizeNameKey(row['Nama Pelanggan']))
    if (!loc) return row
    mapped++
    return {
      ...row,
      'Alamat':   loc.alamat,
      'Kec':      loc.kec,
      'Kab/Kota': loc.kotaKab,
      'Kota':     loc.kotaKab,
      'City':     loc.kotaKab,
      'Provinsi': loc.provinsi,
    }
  })
  return { rows, mappedCount: mapped, totalCount: soRows.length }
}

export function exportToExcel(data, fileName = 'export.xlsx') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, fileName)
}
