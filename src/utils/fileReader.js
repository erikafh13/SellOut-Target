// utils/fileReader.js
import * as XLSX from 'xlsx'
import { parseRupiah, mapNamaDept, mapCity, BULAN_INDONESIA } from './calculations'

export function readFileAsBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsArrayBuffer(file)
  })
}

export function parseExcelOrCsv(buffer, fileName, options = {}) {
  const wb = XLSX.read(buffer, { type: 'array', ...options })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

function readCsvAsRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.onload = e => {
      try {
        const text    = e.target.result
        const sep     = text.indexOf('\t') !== -1 ? '\t' : ','
        const rows    = []
        let pos       = 0
        const len     = text.length

        let nl = text.indexOf('\n', pos)
        if (nl === -1) { resolve([]); return }
        const headers = text.slice(pos, nl).replace(/\r$/, '').split(sep)
          .map(h => h.replace(/^"|"$/g, '').trim())
        pos = nl + 1

        while (pos < len) {
          nl = text.indexOf('\n', pos)
          if (nl === -1) nl = len
          const line = text.slice(pos, nl).replace(/\r$/, '')
          pos = nl + 1
          if (!line.trim()) continue
          const vals = line.split(sep)
          const obj  = {}
          headers.forEach((h, i) => {
            obj[h] = (vals[i] ?? '').replace(/^"|"$/g, '').trim()
          })
          rows.push(obj)
        }
        resolve(rows)
      } catch(err) {
        reject(err)
      }
    }
    reader.readAsText(file, 'UTF-8')
  })
}

function parseTglFaktur(s) {
  if (!s) return null
  if (s instanceof Date && !isNaN(s.getTime())) {
    return s
  }
  const str = String(s).trim()
  const dIso = new Date(str)
  if (!isNaN(dIso.getTime()) && str.includes('-') && str.length > 10) {
    return dIso
  }
  const m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m2) {
    const d = new Date(`${m2[1]}-${m2[2]}-${m2[3]}`)
    if (!isNaN(d)) return d
  }
  const m = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (m) {
    const d = new Date(`${m[2]} ${m[1]}, ${m[3]}`)
    if (!isNaN(d)) return d
  }
  const m3 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m3) {
    const d = new Date(`${m3[3]}-${m3[2].padStart(2,'0')}-${m3[1].padStart(2,'0')}`)
    if (!isNaN(d)) return d
  }
  return null
}

export function normalizeSoFormatBaru(row) {
  const namaAsli = String(row['Nama Pelanggan'] ?? '').trim()
  if (namaAsli.toUpperCase().includes('SHOPEE') || namaAsli.toUpperCase().includes('AIRPAY')) {
    console.log('Shopee/Airpay ditemukan:', namaAsli)
  }
  
  const tglRaw = row['Tgl Faktur'] || row['Tanggal'] || '';
  
  const dObj = parseTglFaktur(tglRaw);
  const bulan = dObj ? (BULAN_INDONESIA[dObj.getMonth() + 1] ?? '') : '';
  const tahun = dObj ? dObj.getFullYear() : 0;

  let tglFakturStandard = String(tglRaw).trim();
  if (dObj) {
    const yyyy = dObj.getFullYear();
    const mm = String(dObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dObj.getDate()).padStart(2, '0');
    tglFakturStandard = `${yyyy}-${mm}-${dd}`;
  }

  let totalRaw = String(row['Total'] || row['Jumlah'] || '0').replace(/[^0-9,-]+/g, "");
  if (totalRaw.includes(',')) totalRaw = totalRaw.split(',')[0];
  const totalClean = parseFloat(totalRaw) || 0;

  const mappedDept = mapNamaDept(row)
  const kota = mapCity(mappedDept)

  return {
    'No. Faktur':            String(row['No. Faktur'] ?? '').trim(),
    'Tgl Faktur':            tglFakturStandard,
    'Bulan':                 bulan,
    'Tahun':                 tahun,
    'Nama Pelanggan':        String(row['Nama Pelanggan'] ?? '').trim(),
    'No. Barang':            String((row['SKU'] || row['No. Barang']) ?? '').trim(),
    'SKU':                   String((row['SKU'] || row['No. Barang']) ?? '').trim(),
    'BRAND Barang':          String((row['Brand'] || row['BRAND Barang']) ?? '').trim(),
    'Brand':                 String((row['Brand'] || row['BRAND Barang']) ?? '').trim(),
    'Kategori':              String(row['Kategori'] ?? '').trim(),
    'Nama Barang':           String((row['Nama Item'] || row['Nama Barang']) ?? '').trim(),
    'Nama Item':             String((row['Nama Item'] || row['Nama Barang']) ?? '').trim(),
    'Qty':                   parseFloat(String(row['Quantity'] || row['Qty'] || '0').replace(',', '.')) || 0,
    'Quantity':              parseInt(row['Quantity'] || row['Qty'] || 0),
    'Harga Sat':             row['Harga Sat'] || 0,
    'Jumlah':                totalClean,
    'Total':                 totalClean,
    'Sales':                 String(row['Sales'] ?? '').trim(),
    'Gudang':                String(row['Gudang'] ?? '').trim(),
    'Dept.':                 mappedDept,
    'Nama Dept.':            mappedDept,
    'Lokasi Toko Pelanggan': String(row['Lokasi Toko Pelanggan'] || row['Lokasi Toko'] || '').trim(),
    'Kota':                  kota,
    'City':                  kota,
    'Kab/Kota':              kota,
    'Status':                String(row['Status'] ?? '').trim(),
    // Kolom lokasi dikosongkan — akan diisi lewat mapping distributor
    'Alamat':                '',
    'Kec':                   '',
    'Provinsi':              '',
    'Periode':               bulan && tahun ? `${bulan} ${tahun}` : '',
  };
}

function normalizeSoHistorisA(row) {
  const brand     = String(row['BRAND Barang'] ?? '').trim()
  const rawPelanggan = String(row['Nama Pelanggan'] ?? '').trim()
  if (!brand && !rawPelanggan) return null

  const tglStrA = String(row['Tgl Faktur'] ?? '').trim()
  const dA      = parseTglFaktur(tglStrA)
  const bulan   = dA ? (BULAN_INDONESIA[dA.getMonth() + 1] ?? '') : String(row['Bulan'] ?? '').toUpperCase().trim()
  const tahun   = dA ? dA.getFullYear() : (parseInt(row['Tahun']) || 0)

  const mappedDept = mapNamaDept(row)
  const kota = mapCity(mappedDept)

  return {
    'No. Faktur':            String(row['No. Faktur'] ?? '').trim(),
    'Tgl Faktur':            tglStrA,
    'Bulan':                 bulan,
    'Tahun':                 tahun,
    'Nama Pelanggan':        String(row['Nama Pelanggan'] ?? '').trim(),
    'No. Barang':            String(row['No. Barang'] ?? '').trim(),
    'SKU':                   String(row['No. Barang'] ?? '').trim(),
    'BRAND Barang':          brand,
    'Brand':                 brand,
    'Kategori':              String(row['Nama Kategori Barang Barang'] ?? row['Kategori'] ?? '').trim(),
    'Nama Barang':           String(row['Keterangan Barang'] ?? row['Nama Barang'] ?? '').trim(),
    'Nama Item':             String(row['Keterangan Barang'] ?? row['Nama Barang'] ?? '').trim(),
    'Qty':                   parseFloat(String(row['Kuantitas'] ?? row['Qty'] ?? '0').replace(',', '.')) || 0,
    'Quantity':              parseFloat(String(row['Kuantitas'] ?? row['Qty'] ?? '0').replace(',', '.')) || 0,
    'Jumlah':                parseRupiah(row['Jumlah']),
    'Total':                 parseRupiah(row['Jumlah']),
    'Sales':                 String(row['Sales'] ?? '').trim(),
    'Dept.':                 mappedDept,
    'Nama Dept.':            mappedDept,
    'Lokasi Toko Pelanggan': String(row['Lokasi Toko Pelanggan'] ?? '').trim(),
    'Kota':                  kota,
    'City':                  kota,
    'Kab/Kota':              kota,
    'Status':                '',
    'Alamat':                '',
    'Kec':                   '',
    'Provinsi':              '',
  }
}

function detectFormat(rows) {
  if (!rows.length) return 'NEW'
  const keys = Object.keys(rows[0])
  const has = k => keys.some(x => x.trim() === k)
  if (has('SKU') || has('Total') || has('Quantity') || has('Brand')) return 'NEW'
  return 'OLD'
}

export async function readSoHistoris(files) {
  const fileList = (files instanceof File) ? [files] : Array.from(files)
  const allRows  = []

  for (const file of fileList) {
    let rows
    if (file.name.toLowerCase().endsWith('.csv')) {
      rows = await readCsvAsRows(file)
    } else {
      const buffer = await readFileAsBuffer(file)
      rows = parseExcelOrCsv(buffer, file.name)
    }
    const fmt      = detectFormat(rows)
    const normFn   = fmt === 'NEW' ? normalizeSoFormatBaru : normalizeSoHistorisA
    
    for (let i = 0; i < rows.length; i++) {
      const r = normFn(rows[i])
      if (r) allRows.push(r)
      if (i % 10000 === 0) await new Promise(res => setTimeout(res, 0))
    }
  }

  const seen = new Set()
  const result = []
  for (const r of allRows) {
    const key = `${r['No. Faktur']}|${r['SKU']}|${r['Bulan']}|${r['Tahun']}|${r['Nama Pelanggan']}|${r['Total']}`
    if (!seen.has(key)) { seen.add(key); result.push(r) }
  }
  return result
}

export async function readTarget(file) {
  const buffer = await readFileAsBuffer(file)
  const rows   = parseExcelOrCsv(buffer, file.name)
  return rows.map(r => {
    const keys      = Object.keys(r)
    const brandKey  = keys.find(k => k.toLowerCase() === 'brand') ?? 'brand'
    const targetKey = keys.find(k => k.toLowerCase() === 'target') ?? 'Target'
    return {
      brand:  String(r[brandKey] ?? '').trim(),
      target: parseRupiah(r[targetKey]),
    }
  }).filter(r => r.brand && r.target > 0)
}

// ─── DISTRIBUTOR DATA ────────────────────────────────────────────────────────

/**
 * Baca file data distributor (Excel/CSV)
 * Format: Customer No. | Customer Name | Addres | Alamat Google | Provinsi | Kota/Kabupaten | Kecamatan
 * Returns array of normalized distributor objects
 */
export async function readDistributorFile(file) {
  let rows = []
  if (file.name.toLowerCase().endsWith('.csv')) {
    rows = await readCsvAsRows(file)
  } else {
    const buffer = await readFileAsBuffer(file)
    rows = parseExcelOrCsv(buffer, file.name)
  }

  return rows.map(r => {
    const keys = Object.keys(r)

    // Flexible column name matching
    const find = (...candidates) => {
      for (const c of candidates) {
        const k = keys.find(k => k.toLowerCase().replace(/[\s./]/g, '') === c.toLowerCase().replace(/[\s./]/g, ''))
        if (k !== undefined) return String(r[k] ?? '').trim()
      }
      return ''
    }

    const customerNo   = find('CustomerNo.', 'CustomerNo', 'No', 'ID')
    const customerName = find('CustomerName', 'Nama', 'Name')
    const address      = find('Addres', 'Address', 'Alamat', 'Alamatlengkap')
    const alamatGoogle = find('AlamatGoogle', 'Google', 'AlamatGoogleMaps')
    const provinsi     = find('Provinsi', 'Province')
    const kotaKab      = find('Kota/Kabupaten', 'KotaKabupaten', 'Kota', 'Kabupaten', 'KabKota')
    const kecamatan    = find('Kecamatan', 'Kec', 'District')

    if (!customerName) return null

    return {
      customerNo,
      customerName,
      customerNameUpper: customerName.toUpperCase(),
      address,
      alamatGoogle,
      provinsi,
      kotaKab,
      kecamatan,
    }
  }).filter(Boolean)
}

/**
 * Bangun lookup map dari data distributor
 * Key: nama pelanggan (uppercase, normalized)
 * Value: { alamat, kec, kotaKab, provinsi }
 */
export function buildDistributorMap(distributorData) {
  const map = new Map()
  for (const d of distributorData) {
    const key = normalizeNameKey(d.customerName)
    if (key) {
      map.set(key, {
        alamat:   d.address || d.alamatGoogle || '',
        kec:      d.kecamatan || '',
        kotaKab:  d.kotaKab || '',
        provinsi: d.provinsi || '',
      })
    }
  }
  return map
}

function normalizeNameKey(name) {
  return String(name ?? '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Apply mapping distributor ke data SO
 * Untuk setiap baris SO, cari Nama Pelanggan di distributor map
 * Jika ketemu, isi kolom lokasi dari data distributor
 * Returns array SO yang sudah di-enrich dengan data lokasi
 */
export function applyDistributorMapping(soRows, distributorMap) {
  let mapped = 0
  const result = soRows.map(row => {
    const pelanggan = normalizeNameKey(row['Nama Pelanggan'] || '')
    if (!pelanggan) return row

    const loc = distributorMap.get(pelanggan)
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

  return { rows: result, mappedCount: mapped, totalCount: soRows.length }
}

export function exportToExcel(data, fileName = 'export.xlsx') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, fileName)
}