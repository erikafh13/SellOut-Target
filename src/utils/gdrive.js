// utils/gdrive.js
import * as XLSX from 'xlsx'
import { parseRupiah, mapNamaDept, mapCity, BULAN_INDONESIA } from './calculations'
import { cleanBrand, cleanPelanggan } from './brandCleaner'

export const FOLDER_PENJUALAN = '1Okgw8qHVM8HyBwnTUFHbmYkNKqCcswNZ'
export const GOOGLE_CLIENT_ID = '831644602232-i8kurqsvjfu1as25t17jlmf9r5m3ifrq.apps.googleusercontent.com'
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

let _accessToken = null
let _tokenExpiry  = 0

export function isConnected() { return !!_accessToken && Date.now() < _tokenExpiry }

export function loginWithGoogle() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload  = () => startTokenFlow(resolve, reject)
      script.onerror = () => reject(new Error('Gagal memuat Google Identity Services.'))
      document.head.appendChild(script)
    } else {
      startTokenFlow(resolve, reject)
    }
  })
}

function startTokenFlow(resolve, reject) {
  if (!window.google?.accounts?.oauth2) { reject(new Error('Google Identity Services tidak tersedia.')); return }
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPE,
    callback: (response) => {
      if (response.error) { reject(new Error(`Login gagal: ${response.error}`)); return }
      _accessToken = response.access_token
      _tokenExpiry  = Date.now() + (response.expires_in ?? 3600) * 1000
      resolve(response.access_token)
    },
  })
  client.requestAccessToken({ prompt: 'consent' })
}

export function logout() {
  if (_accessToken && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(_accessToken)
  _accessToken = null; _tokenExpiry = 0
}

async function ensureToken() {
  if (isConnected()) return _accessToken
  return loginWithGoogle()
}

export async function listFilesInFolder(folderId) {
  const token = await ensureToken()
  const query = encodeURIComponent(`'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`)
  const resp  = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&pageSize=100&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!resp.ok) throw new Error(`Gagal list file: ${resp.status}`)
  return (await resp.json()).files ?? []
}

export async function downloadFile(fileId) {
  const token = await ensureToken()
  const resp  = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } })
  if (!resp.ok) throw new Error(`Download gagal: ${resp.status}`)
  return resp.arrayBuffer()
}

export async function readSoBerjalanFromDrive(fileId, fileName) {
  const buffer = await downloadFile(fileId)
  let rows = []
  if (fileName.toLowerCase().endsWith('.csv')) {
    const text = new TextDecoder('utf-8').decode(buffer)
    rows = csvToRows(text)
  } else {
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows     = XLSX.utils.sheet_to_json(ws, { defval: '' })
  }
  return rows.map(r => normalizeSoBerjalan(r)).filter(r => r !== null)
}

export function normalizeSoBerjalan(row) {
  if (!row['No. Faktur'] && !row['Nama Pelanggan']) return null
  const tglStr  = String(row['Tgl Faktur'] ?? '').trim()
  let bulan = '', tahun = '', tglFaktur = tglStr
  const dateObj = parseTanggal(tglStr)
  if (dateObj) {
    bulan     = BULAN_INDONESIA[dateObj.getMonth() + 1] ?? ''
    tahun     = dateObj.getFullYear()
    tglFaktur = dateObj.toISOString().split('T')[0] + ' 00:00:00'
  }
  const mappedDept = mapNamaDept(row)
  const kota      = mapCity(mappedDept)
  const jumlah    = parseRupiah(row['Jumlah'])
  const brand     = cleanBrand(row['BRAND Barang']) ?? String(row['BRAND Barang'] ?? '').trim()
  const pelanggan = cleanPelanggan(row)

  return {
    'No. Faktur':            String(row['No. Faktur'] ?? '').trim(),
    'Tgl Faktur':            tglFaktur,
    'Bulan':                 bulan,
    'Tahun':                 tahun,
    'Nama Pelanggan':        pelanggan,
    'No. Barang':            String(row['No. Barang'] ?? '').trim(),
    'BRAND Barang':          brand,
    'Kategori':              String(row['Kategori'] ?? '').trim(),
    'Nama Barang':           String(row['Nama Barang'] ?? '').trim(),
    'Qty':                   parseFloat(String(row['Qty'] ?? '0').replace(',', '.')) || 0,
    'Jumlah':                jumlah,
    'Sales':                 String(row['Sales'] ?? '').trim(),
    'Dept.':                 mappedDept,
    'Nama Dept.':            mappedDept,
    'Lokasi Toko Pelanggan': String(row['Lokasi Toko Pelanggan'] ?? '').trim(),
    'Kota':                 kota,
    'City':                  kota,
    'Kab/Kota':              kota,
    'Category':              String(row['Category'] ?? row['Kategori'] ?? '').trim(),
    'Market Place':          String(row['Market Place'] ?? '').trim(),
  }
}

function parseTanggal(str) {
  if (!str) return null
  const parts = str.trim().split(/\s+/)
  if (parts.length === 3) {
    const d = new Date(`${parts[1]} ${parts[0]}, ${parts[2]}`)
    if (!isNaN(d)) return d
  }
  const d2 = new Date(str.split(' ')[0])
  if (!isNaN(d2)) return d2
  return null
}

function csvToRows(text) {
  const sep   = text.includes('\t') ? '\t' : ','
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(sep).map(h => h.trim())
  return lines.slice(1).map(line => {
    const vals = line.split(sep)
    const obj  = {}
    headers.forEach((h, i) => { obj[h] = vals[i]?.trim() ?? '' })
    return obj
  })
}