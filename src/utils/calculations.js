// utils/calculations.js
import { cleanBrand } from './brandCleaner'

export const BULAN_INDONESIA = {
  1:'JANUARI',2:'FEBRUARI',3:'MARET',4:'APRIL',
  5:'MEI',6:'JUNI',7:'JULI',8:'AGUSTUS',
  9:'SEPTEMBER',10:'OKTOBER',11:'NOVEMBER',12:'DESEMBER',
}
export const BULAN_ORDER = Object.values(BULAN_INDONESIA)

export function mapNamaDept(row) {
  const dept      = String(row['Dept.'] ?? '').trim().toUpperCase()
  const pelanggan = String(row['Nama Pelanggan'] ?? '').trim().toUpperCase()

  if (dept === 'A') {
    if (['A - CASH','AIRPAY INTERNATIONAL INDONESIA','TOKOPEDIA'].includes(pelanggan)) return 'A - ITC'
    return 'A - RETAIL'
  }

  const m = {
    B:'B - JKT', C:'C - PUSAT', D:'D - SMG', E:'E - JOG',
    F:'F - MLG',  G:'G - PROJECT', H:'H - BALI', X:'X'
  }
  return m[dept] ?? 'X'
}

// Mapping dept → kota
const CITY_MAP = {
  'A - ITC':    'Surabaya',  'A - RETAIL': 'Surabaya',
  'C - PUSAT':  'Surabaya',  'G - PROJECT': 'Surabaya',
  'B - JKT':    'Jakarta',   'D - SMG':     'Semarang',
  'E - JOG':    'Jogja',    'F - MLG':     'Malang',
  'H - BALI':   'Bali',
}
export function mapCity(namaDept) {
  return CITY_MAP[namaDept] ?? 'Others'
}

export function formatRupiah(val) {
  if (val == null || isNaN(val)) return 'Rp 0'
  return 'Rp ' + Math.round(val).toLocaleString('id-ID')
}
export function formatPersen(val, d=1) {
  if (val == null || isNaN(val)) return '0%'
  return val.toFixed(d) + '%'
}
export function parseRupiah(str) {
  if (typeof str === 'number') return str
  const s = String(str).replace(/[^0-9,.-]/g, '')
  if (s.includes('.') && s.includes(',')) {
    return s.lastIndexOf('.') > s.lastIndexOf(',')
      ? parseFloat(s.replace(/,/g, '')) || 0
      : parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  }
  if (s.includes(',') && !s.includes('.')) {
    const parts = s.split(',')
    if (parts.length === 2 && parts[1].length <= 2) return parseFloat(s.replace(',', '.')) || 0
    return parseFloat(s.replace(/,/g, '')) || 0
  }
  if (s.includes('.')) {
    const parts = s.split('.')
    if (parts.length > 2) return parseFloat(s.replace(/\./g, '')) || 0
    if (parts[1]?.length <= 2) return parseFloat(s) || 0
    return parseFloat(s.replace(/\./g, '')) || 0
  }
  return parseFloat(s) || 0
}

export function getAchievementStatus(pct) {
  if (pct >= 115) return { label:'Melebihi Target', cls:'tag-purple', color:'#c084fc' }
  if (pct >= 100) return { label:'Capai Target',    cls:'tag-green',  color:'#4ade80' }
  if (pct >= 80)  return { label:'Hampir Capai',    cls:'tag-yellow', color:'#fbbf24' }
  return              { label:'Di Bawah Target',    cls:'tag-red',    color:'#f87171' }
}

export function get3BulanHistoris(targetBulan, targetTahun) {
  const result = []
  let m = targetBulan - 1, y = targetTahun
  for (let i = 0; i < 3; i++) {
    if (m < 1) { m = 12; y-- }
    result.unshift({ bulan: BULAN_INDONESIA[m], tahun: y })
    m--
  }
  return result
}

export function get12BulanHistoris(targetBulan, targetTahun) {
  const result = []
  let m = targetBulan - 1, y = targetTahun
  for (let i = 0; i < 12; i++) {
    if (m < 1) { m = 12; y-- }
    result.unshift({ bulan: BULAN_INDONESIA[m], tahun: y })
    m--
  }
  return result
}

export function filterHistoris(rows, targetBulan, targetTahun) {
  const w3   = get3BulanHistoris(targetBulan, targetTahun)
  const keys = new Set(w3.map(w => `${w.bulan}-${w.tahun}`))
  return rows.filter(r => keys.has(`${String(r['Bulan']??'').toUpperCase()}-${r['Tahun']}`))
}

// ── Dealer grouping: SHOPEE / TOKOPEDIA / WEBSITE / OFFLINE ──────────────────
// Urutan penting — lebih spesifik di atas, lebih umum di bawah
const SHOPEE_MAP_CALC = [
  { match: nama => nama === 'D - SHOPEE',                toko: 'Shopee SMG'          },
  { match: nama => nama === 'F - SHOPEE',                toko: 'Shopee MLG'          },
  { match: nama => nama === 'SHOPEE - WD',               toko: 'Shopee WD'           },
  { match: nama => nama === 'AIRPAY - MONITORZONE',      toko: 'Shopee Monitor Zone' },
  { match: nama => nama === 'E - SHOPEE',                toko: 'Shopee JOG'          },
  { match: nama => nama === 'AIRPAY INTERNATIONAL INDONESIA', toko: 'Shopee DB Klik Mall' },
  { match: nama => nama === 'AIRPAY.ID',                 toko: 'Shopee JKT'          },
  { match: nama => nama.includes('AIRPAY'),              toko: 'Shopee' },
]

const TOKPED_MAP_CALC = [
  { match: nama => nama === 'TOKOPEDIA',    toko: 'Tokopedia Indonesia' },
  { match: nama => nama === 'TOKOPEDIA.ID', toko: 'Tokopedia Jakarta'   },
  { match: nama => nama.includes('TOKOPEDIA') || nama.includes('TOKPED'), toko: 'Tokopedia' },
]

export function cleanPelanggan(row) {
  const nama     = String(row['Nama Pelanggan'] ?? '').trim().toUpperCase()
  const noFaktur = String(row['No. Faktur'] ?? '').trim().toUpperCase()

  for (const e of SHOPEE_MAP_CALC)  { if (e.match(nama)) return e.toko }
  for (const e of TOKPED_MAP_CALC)  { if (e.match(nama)) return e.toko }

  const retailPrefixes = ['AO','BO','DO','EO','FO','HO']
  if (retailPrefixes.some(p => noFaktur.startsWith(p))) return 'WEBSITE / RETAIL'

  return String(row['Nama Pelanggan'] ?? '').trim()
}

export function hitungTargetOtomatis(rows, targetBulan, targetTahun) {
  const w3   = get3BulanHistoris(targetBulan, targetTahun)
  const keys = new Set(w3.map(w => `${w.bulan}-${w.tahun}`))
  const brandBulan = {}
  for (const row of rows) {
    const key = `${String(row['Bulan']??'').toUpperCase()}-${row['Tahun']}`
    if (!keys.has(key)) continue

    const brand  = cleanBrand((row['Brand'] || row['BRAND Barang']) ?? '')
    if (!brand) continue
    const jumlah = parseRupiah(row['Total'] || row['Jumlah'])
    if (!brandBulan[brand]) brandBulan[brand] = {}
    brandBulan[brand][key] = (brandBulan[brand][key] || 0) + jumlah
  }
  const result = []
  for (const [brand, bulanMap] of Object.entries(brandBulan)) {
    const vals = Object.values(bulanMap)
    const avg  = vals.reduce((a,b)=>a+b,0) / vals.length
    result.push({ brand, avgBulanan: Math.round(avg), target: Math.round(avg * 1.15) })
  }
  return result.sort((a,b) => b.target - a.target)
}

function hitungPctRows(rows, groupKey, extraKey=null) {
  const perBulan = {}
  for (const row of rows) {
    const monthKey = `${row['Bulan']}-${row['Tahun']}`
    const grp = String(row[groupKey]??'').trim()
    if (!grp) continue
    const jml = parseRupiah(row['Total'] || row['Jumlah']) || 0
    if (!perBulan[monthKey]) perBulan[monthKey] = {}
    if (!perBulan[monthKey][grp]) perBulan[monthKey][grp] = { val:0, extra: extraKey ? String(row[extraKey]??'').trim() : null }
    perBulan[monthKey][grp].val += jml
  }
  const pctPerBulan = {}
  for (const [, grpMap] of Object.entries(perBulan)) {
    const total = Object.values(grpMap).reduce((a,b)=>a+b.val,0)
    if (!total) continue
    for (const [grp, {val, extra}] of Object.entries(grpMap)) {
      if (!pctPerBulan[grp]) pctPerBulan[grp] = { pcts:[], extra }
      pctPerBulan[grp].pcts.push((val/total)*100)
    }
  }
  const result = {}
  for (const [grp, {pcts, extra}] of Object.entries(pctPerBulan))
    result[grp] = { pct: pcts.reduce((a,b)=>a+b,0)/pcts.length, extra }
  const totalPct = Object.values(result).reduce((a,b)=>a+b.pct,0)
  if (totalPct > 0) for (const g of Object.keys(result)) result[g].pct = (result[g].pct/totalPct)*100
  return result
}

export function distribusiTarget(historisRows, targetBrand, brand) {
  const pctDealer = hitungPctHistoris(historisRows, brand, 'Nama Pelanggan')
  const result = {}
  for (const [dealer, pct] of Object.entries(pctDealer)) {
    const targetDealer = (pct/100) * targetBrand
    result[dealer] = { pct, target: targetDealer, kategori: {} }
    const rowsDealer = historisRows.filter(r => {
      const rowBrand = cleanBrand((r['Brand'] || r['BRAND Barang']) ?? '')
      return rowBrand && rowBrand.toUpperCase() === brand.toUpperCase() && cleanPelanggan(r) === dealer
    })
    const pctKat = hitungPctRows(rowsDealer, 'Kategori')
    for (const [kat, pctK] of Object.entries(pctKat)) {
      const targetKat = (pctK.pct/100) * targetDealer
      result[dealer].kategori[kat] = { pct: pctK.pct, target: targetKat, sku: {} }
      const rowsKat = rowsDealer.filter(r => String(r['Kategori']??'').trim() === kat)

      const pctSku  = hitungPctRows(rowsKat, 'SKU', 'Nama Item')
      for (const [skuCode, skuData] of Object.entries(pctSku)) {
        result[dealer].kategori[kat].sku[skuCode] = {
          pct: skuData.pct, target: (skuData.pct/100)*targetKat, namaItem: skuData.extra,
        }
      }
    }
  }
  return result
}

export function hitungAchievement(soberjalanRows, distribusi, brand) {
  const real = {}
  for (const row of soberjalanRows) {
    const rowBrand = cleanBrand((row['Brand'] || row['BRAND Barang']) ?? '')
    if (!rowBrand || rowBrand.toUpperCase() !== brand.toUpperCase()) continue

    const dealer = cleanPelanggan(row)
    const kat    = String(row['Kategori']??'').trim()

    const sku    = String((row['SKU'] || row['No. Barang']) ?? '').trim()
    const jml    = parseRupiah(row['Total'] || row['Jumlah']) || 0

    if (!real[dealer]) real[dealer] = { total:0, kategori:{} }
    real[dealer].total += jml
    if (!real[dealer].kategori[kat]) real[dealer].kategori[kat] = { total:0, sku:{} }
    real[dealer].kategori[kat].total += jml
    if (!real[dealer].kategori[kat].sku[sku]) real[dealer].kategori[kat].sku[sku] = 0
    real[dealer].kategori[kat].sku[sku] += jml
  }
  const result = {}
  for (const [dealer, info] of Object.entries(distribusi)) {
    const realization = real[dealer]?.total ?? 0
    const ach         = info.target > 0 ? (realization/info.target)*100 : 0
    result[dealer]    = { target:info.target, pct:info.pct, realization, achievement:ach, status:getAchievementStatus(ach), kategori:{} }
    for (const [kat, ki] of Object.entries(info.kategori)) {
      const rKat   = real[dealer]?.kategori[kat]?.total ?? 0
      const achKat = ki.target>0?(rKat/ki.target)*100:0
      result[dealer].kategori[kat] = { target:ki.target, pct:ki.pct, realization:rKat, achievement:achKat, status:getAchievementStatus(achKat), sku:{} }
      for (const [skuNo, si] of Object.entries(ki.sku)) {
        const rSku   = real[dealer]?.kategori[kat]?.sku[skuNo] ?? 0
        const achSku = si.target>0?(rSku/si.target)*100:0
        result[dealer].kategori[kat].sku[skuNo] = { namaItem: si.namaItem || si.namaBarang, target:si.target, pct:si.pct, realization:rSku, achievement:achSku, status:getAchievementStatus(achSku) }
      }
    }
  }
  return result
}

function hitungPctHistoris(data, brand, groupKey) {
  const perBulan = {}
  for (const row of data) {
    const rowBrand = cleanBrand((row['Brand'] || row['BRAND Barang']) ?? '')
    if (!rowBrand || rowBrand.toUpperCase() !== brand.toUpperCase()) continue
    const monthKey = `${row['Bulan']}-${row['Tahun']}`
    const grp      = String(row[groupKey]??'').trim()
    const jml      = parseRupiah(row['Total'] || row['Jumlah']) || 0
    if (!perBulan[monthKey]) perBulan[monthKey] = {}
    perBulan[monthKey][grp] = (perBulan[monthKey][grp] ?? 0) + jml
  }
  const pctPerBulan = {}
  for (const [, grpMap] of Object.entries(perBulan)) {
    const total = Object.values(grpMap).reduce((a,b)=>a+b,0)
    if (!total) continue
    for (const [grp, val] of Object.entries(grpMap)) {
      if (!pctPerBulan[grp]) pctPerBulan[grp] = []
      pctPerBulan[grp].push((val/total)*100)
    }
  }
  const result = {}
  for (const [grp, pcts] of Object.entries(pctPerBulan))
    result[grp] = pcts.reduce((a,b)=>a+b,0) / pcts.length
  const totalPct = Object.values(result).reduce((a,b)=>a+b,0)
  if (totalPct > 0) for (const g of Object.keys(result)) result[g] = (result[g]/totalPct)*100
  return result
}