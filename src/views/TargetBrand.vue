<template>
  <div class="page">
    <div class="page-header-container">
      <div class="page-header-text">
        <h1 class="page-title">Input Target By Brand</h1>
        <p class="page-sub" v-if="store.targetBulan">
          Periode Jendela Historis: <strong>{{ window3Label }}</strong> · Menentukan Target Final Dashboard By Dealer
        </p>
      </div>

      <div class="header-action-panel" v-if="store.soBerjalan.length && store.targetBulan">
        <div class="target-pct-group">
          <label class="target-pct-label">Target Berdasarkan</label>
          <select v-model="targetMode" class="target-pct-select" :disabled="targetLocked">
            <option value="historis">Rata-rata Historis</option>
            <option value="input_pct">Input % Target</option>
          </select>
          <div v-if="targetMode === 'input_pct'" class="target-pct-input-wrap">
            <input type="number" v-model.number="targetPct" min="1" max="999" placeholder="15" class="target-pct-input" :disabled="targetLocked" />
            <span class="target-pct-suffix">%</span>
          </div>
          <button v-if="!targetLocked" class="target-confirm-btn" @click="confirmTargetPct" title="Kunci & Terapkan">
            ✓
          </button>
          <button v-else class="target-locked-btn" @click="unlockTargetPct" title="Buka kunci untuk ubah">
            🔒
          </button>
        </div>
        <button class="btn-action btn-export" @click="exportDataAktifExcel">
          📥 Export Data (.xlsx)
        </button>
        <button class="btn-action btn-import" @click="showImportModal = true">
          📤 Import Target Brand
        </button>
      </div>
    </div>

    <div v-if="!store.soBerjalan.length" class="empty">
      Upload data SO Berjalan di halaman Input Data terlebih dahulu.
    </div>
    <div v-else-if="!store.targetBulan" class="empty">
      Set bulan target di halaman Input Data terlebih dahulu.
    </div>

    <div v-else>
      <!-- SCORECARD: 4 item, tanpa divider -->
      <div class="scoretable-card">
        <div class="scoretable-grid">
          <div class="scorecard-item">
            <div class="scorecard-label">Total Target Historis</div>
            <div class="scorecard-value">{{ fmt(totalTargetHistorisAll) }}</div>
          </div>
          <div class="scorecard-item">
            <div class="scorecard-label">Rata-rata Target Historis</div>
            <div class="scorecard-value">{{ fmt(avgTargetHistorisAll) }}</div>
          </div>
          <div class="scorecard-item">
            <div class="scorecard-label">Total Target Final</div>
            <div class="scorecard-value scorecard-blue">{{ fmt(totalTargetFinalAll) }}</div>
          </div>
          <div class="scorecard-item">
            <div class="scorecard-label">Rata-rata Target Final</div>
            <div class="scorecard-value scorecard-blue">{{ fmt(avgTargetFinalAll) }}</div>
          </div>
        </div>
      </div>

      <div class="table-card">
      <div class="table-header-bar">
        <h2 class="table-title">MATRIKS FORMULASI TARGET PER BRAND</h2>
        
        <div class="filter-controls-group">
          <select v-model="filterStatusAcc" class="filter-acc-select">
            <option value="">Status</option>
            <option value="auto">🔄 Auto</option>
            <option value="locked">🔐 Kunci</option>
            <option value="pending">⚠️ Ubah</option>
          </select>
          
          <input v-model="searchQuery" placeholder="🔍 Cari brand..." class="search-input" />
        </div>
      </div>

      <div class="table-scroll-container">
        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">No</th>
              <th class="sortable text-center" @click="sortBy('name')">Nama Brand {{ sortIcon('name') }}</th>
              <th class="num sortable" @click="sortBy('targetHistoris')" style="width: 160px;">Target Historis {{ sortIcon('targetHistoris') }}</th>
              <th class="sortable text-center" @click="sortBy('targetManual')" style="width: 160px;">Target Brand {{ sortIcon('targetManual') }}</th>
              <th class="num sortable" @click="sortBy('nilaiTengah')" style="width: 140px;">Nilai Tengah {{ sortIcon('nilaiTengah') }}</th>
              <th class="text-center" style="width: 290px;">Target Input</th>
              <th class="sortable text-center" style="width: 130px; text-align: center;" @click="sortBy('isAcc')">Status {{ sortIcon('isAcc') }}</th>
              <th class="num sortable" @click="sortBy('targetFinal')" style="width: 160px;">Target Final {{ sortIcon('targetFinal') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, idx) in filteredBrands" :key="b.name" :class="{ 'row-locked': b.isAcc }">
              <td class="idx-col">{{ idx + 1 }}</td>
              <td class="brand-name-col">{{ b.name }}</td>
              
              <td class="num font-mono text-slate">{{ fmt(b.targetHistoris) }}</td>
              
              <td>
                <div class="input-with-prefix" :class="{ 'input-disabled': b.isAcc || b.isAutoMode }">
                  <span>Rp</span>
                  <input type="number" v-model.number="b.targetManual" @input="onTargetManualInput(b)" placeholder="Input target..." class="cell-input" :disabled="b.isAcc || b.isAutoMode" />
                </div>
              </td>

              <td class="num font-mono text-black-normal bold no-wrap-text">{{ fmt(b.nilaiTengah) }}</td>

              <td>
                <div class="acc-mode-container" v-if="!b.isAutoMode">
                  <select v-model="b.accMode" @change="onAccModeChange(b)" class="mode-select" :disabled="b.isAcc">
                    <option value="nilai_tengah">Nilai Tengah</option>
                    <option value="target_brand">Target Brand</option>
                    <option value="input_sendiri">Input</option>
                  </select>

                  <div class="input-with-prefix" :class="{ 'input-disabled': b.accMode !== 'input_sendiri' || b.isAcc }">
                    <span>Rp</span>
                    <input type="number" v-model.number="b.targetInputAcc" placeholder="Isi nominal..." class="cell-input" :disabled="b.accMode !== 'input_sendiri' || b.isAcc" />
                  </div>
                </div>
                <div v-else class="text-muted-placeholder">—</div>
              </td>

              <td style="text-align: center;">
                <button v-if="b.isAutoMode" @click="unlockAutoToPending(b)" class="btn-verify btn-auto-trigger" title="Klik untuk mengubah target brand">
                  🔄 Auto
                </button>
                
                <div v-else class="action-acc-container">
                  <button @click="handleVerification(b)" class="btn-verify" :class="b.isAcc ? 'btn-verified' : 'btn-unverified'">
                    {{ b.isAcc ? '🔐 Kunci' : '⚠️ Ubah' }}
                  </button>
                </div>
              </td>

              <td class="num font-mono text-blue-final bold no-wrap-text">
                {{ fmt(b.targetFinal) }}
              </td>
            </tr>
            <tr v-if="filteredBrands.length === 0">
              <td colspan="8" class="no-data">Tidak ada brand atau status yang cocok dengan kata kunci pencarian.</td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </div>

    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="bubble-modal">
        <div class="modal-header">
          <h3>Import Target Brand</h3>
          <button class="close-btn" @click="showImportModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="instruction">Silakan unduh template di bawah ini, isi atau ubah kolom target, kemudian unggah kembali.</p>
          
          <button class="btn-download-template" @click="exportTemplateOnlyExcel">
            📁 Download Template Excel
          </button>
          
          <div class="upload-zone">
            <span class="upload-label">Pilih file Excel yang telah diisi:</span>
            <input type="file" ref="fileInput" @change="handleImportExcel" accept=".xlsx, .xls" class="file-picker" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useSelloutStore } from '@/stores/sellout'
import { cleanBrand } from '@/utils/brandCleaner'
import { get3BulanHistoris } from '@/utils/calculations'
import { exportToExcel } from '@/utils/fileReader'
import * as XLSX from 'xlsx'

const store = useSelloutStore()
const searchQuery = ref('')
const filterStatusAcc = ref('') 
const fileInput = ref(null)
const showImportModal = ref(false)

const sortKey = ref('name')
const sortOrder = ref('asc')
const targetMode = ref('historis')
const targetPct = ref(15)
const targetLocked = ref(false)

const BULAN_NAMA = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"]

const window3 = computed(() => {
  if (!store.targetBulan) return []
  return get3BulanHistoris(store.targetBulan, store.targetTahun)
})

const window3Keys = computed(() => {
  const keys = new Set()
  window3.value.forEach(w => {
    const bIdx = BULAN_NAMA.indexOf(String(w.bulan).toUpperCase())
    if (bIdx !== -1) keys.add(`${w.tahun}-${String(bIdx + 1).padStart(2, '0')}`)
  })
  return keys
})

const window3Label = computed(() => {
  if (!window3.value.length) return ''
  const w = window3.value
  return `${w[0].bulan.slice(0, 3)} ${w[0].tahun} – ${w[2].bulan.slice(0, 3)} ${w[2].tahun}`
})

function getYearMonth(tglStr) {
  if (!tglStr) return ''
  const s = String(tglStr).trim()
  return s.includes('-') ? s.slice(0, 7) : ''
}

const brandRowsLocal = ref([])

watch(() => [store.soBerjalan, store.targetBulan, targetMode, targetPct], () => {
  if (!store.soBerjalan.length || !store.targetBulan) return
  
  const mapHistoris = {}
  const setBulanActive = {}

  store.soBerjalan.forEach(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return

    const b = cleanBrand(r['Brand'] || r['BRAND Barang'])
    if (!b) return

    const jumlah = Number(r['Total'] || r['Jumlah'] || 0)
    if (!mapHistoris[b]) {
      mapHistoris[b] = 0
      setBulanActive[b] = new Set()
    }
    mapHistoris[b] += jumlah
    setBulanActive[b].add(ym)
  })

  brandRowsLocal.value = Object.keys(mapHistoris).sort().map(brandName => {
    const totalOmsetHist = mapHistoris[brandName]
    const jumlahBulanAktif = setBulanActive[brandName].size || 3
    
    const saved = store.targetBrandInputs?.[brandName.toUpperCase()] || {}

    return reactive({
      name: brandName,
      avgPerBulan: totalOmsetHist / jumlahBulanAktif,
      targetManual: saved.targetManual || 0,
      targetInputAcc: saved.targetInputAcc || 0,
      isAcc: saved.isAcc || false,
      accMode: saved.accMode || 'nilai_tengah',
      isForcePending: saved.isForcePending || false,

      get isAutoMode() {
        return (!this.targetManual || this.targetManual === 0) && !this.isForcePending
      },

      get targetHistoris() {
        if (this._lockedTargetHistoris != null) return this._lockedTargetHistoris
        const multiplier = targetMode.value === 'input_pct' ? (1 + targetPct.value / 100) : 1.15
        return Math.round(this.avgPerBulan * multiplier)
      },

      get nilaiTengah() {
        if (this.isAutoMode) {
          return this.targetHistoris
        }
        if (this._lockedNilaiTengah != null) return this._lockedNilaiTengah
        return Math.round((this.targetHistoris + (this.targetManual || 0)) / 2)
      },

      get targetFinal() {
        if (this.isAutoMode) {
          return this.targetHistoris
        }
        return this.isAcc ? (this.targetInputAcc || 0) : 0
      }
    })
  })
}, { immediate: true })

watch(brandRowsLocal, (newRows) => {
  newRows.forEach(b => {
    if (targetLocked.value) {
      // Kunci: simpan nilai saat ini agar tidak berubah lagi
      b._lockedTargetHistoris = b.targetHistoris
      b._lockedNilaiTengah = b.nilaiTengah
    } else {
      // Unlock: hapus nilai terkunci
      b._lockedTargetHistoris = null
      b._lockedNilaiTengah = null
    }
    if (!b.isAutoMode && !b.isAcc) {
      if (b.accMode === 'nilai_tengah') {
        b.targetInputAcc = b.nilaiTengah
      } else if (b.accMode === 'target_brand') {
        b.targetInputAcc = b.targetManual || 0
      }
    }
  })
}, { deep: true })

const filteredBrands = computed(() => {
  let result = [...brandRowsLocal.value]
  
  if (searchQuery.value) {
    const q = searchQuery.value.toUpperCase()
    result = result.filter(b => b.name.toUpperCase().includes(q))
  }

  if (filterStatusAcc.value) {
    const mode = filterStatusAcc.value
    if (mode === 'auto') {
      result = result.filter(b => b.isAutoMode)
    } else if (mode === 'locked') {
      result = result.filter(b => !b.isAutoMode && b.isAcc === true)
    } else if (mode === 'pending') {
      result = result.filter(b => !b.isAutoMode && b.isAcc === false)
    }
  }
  
  const key = sortKey.value
  const order = sortOrder.value === 'asc' ? 1 : -1
  
  return result.sort((a, b) => {
    if (key === 'isAcc') {
      let statusA = a.isAutoMode ? 'auto' : (a.isAcc ? 'locked' : 'pending')
      let statusB = b.isAutoMode ? 'auto' : (b.isAcc ? 'locked' : 'pending')
      return order * statusA.localeCompare(statusB)
    }
    
    let valA = a[key]
    let valB = b[key]
    if (typeof valA === 'string') return order * valA.localeCompare(valB)
    return order * ((valA || 0) - (valB || 0))
  })
})

// ─── SCORECARD TOTALS ──────────────────────────────────────────────────────────
const totalTargetHistorisAll = computed(() => {
  const brandBulanMap = {}
  store.soBerjalan.forEach(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return
    const b = cleanBrand(r['Brand'] || r['BRAND Barang'])
    if (!b) return
    if (!brandBulanMap[b]) brandBulanMap[b] = { bulanSet: new Set(), total: 0 }
    brandBulanMap[b].bulanSet.add(ym)
    brandBulanMap[b].total += Number(r['Total'] || r['Jumlah'] || 0)
  })
  let total = 0
  Object.values(brandBulanMap).forEach(({ bulanSet, total: t }) => {
    const bulanAktif = bulanSet.size || 3
    total += Math.round(t / bulanAktif)
  })
  return total
})
const avgTargetHistorisAll = computed(() =>
  brandRowsLocal.value.length ? totalTargetHistorisAll.value / brandRowsLocal.value.length : 0
)
const totalTargetFinalAll = computed(() =>
  brandRowsLocal.value.reduce((a, b) => a + (b.targetFinal || 0), 0)
)
const avgTargetFinalAll = computed(() =>
  brandRowsLocal.value.length ? totalTargetFinalAll.value / brandRowsLocal.value.length : 0
)

function sortBy(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'desc'
  }
}

function sortIcon(key) {
  if (sortKey.value !== key) return '↕'
  return sortOrder.value === 'asc' ? '↑' : '↓'
}

function confirmTargetPct() {
  targetLocked.value = true
}

function unlockTargetPct() {
  if (confirm('Buka kunci setting target? Target Final semua brand akan di-reset.')) {
    targetLocked.value = false
  }
}

function saveRow(b) {
  store.updateTargetBrand(b.name, {
    targetManual: b.targetManual,
    targetInputAcc: b.targetInputAcc,
    isAcc: b.isAcc,
    accMode: b.accMode,
    isForcePending: b.isForcePending
  })
}

function unlockAutoToPending(b) {
  const confirmUnlock = confirm(`Apakah Anda yakin ingin MENGUBAH STATUS brand "${b.name}" dari Auto Mirroring ke Mode Modifikasi Target?\n\nTindakan ini akan membuka kunci gembok kolom agar Target Brand dapat Anda isi manual.`);
  
  if (confirmUnlock) {
    b.isForcePending = true
    b.isAcc = false
    b.accMode = 'nilai_tengah'
    b.targetInputAcc = b.nilaiTengah
    saveRow(b)
    alert(`🔓 Akses terbuka! Kolom Target Brand untuk "${b.name}" sekarang bisa diisi.`);
  }
}

function onTargetManualInput(b) {
  if (b.targetManual === '' || b.targetManual === 0) {
    b.targetManual = 0
    b.targetInputAcc = 0
    b.isAcc = false
    b.isForcePending = false
    b.accMode = 'nilai_tengah'
    saveRow(b)
  } else {
    b.isAcc = false
    if (b.accMode === 'nilai_tengah') {
      b.targetInputAcc = b.nilaiTengah
    } else if (b.accMode === 'target_brand') {
      b.targetInputAcc = b.targetManual || 0
    }
    saveRow(b)
  }
}

function onAccModeChange(b) {
  if (b.accMode === 'nilai_tengah') {
    b.targetInputAcc = b.nilaiTengah
  } else if (b.accMode === 'target_brand') {
    b.targetInputAcc = b.targetManual || 0
  } else {
    // input_sendiri: kosongkan agar user isi sendiri
    b.targetInputAcc = ''
  }
  saveRow(b)
}

function handleVerification(b) {
  if (!b.targetInputAcc || b.targetInputAcc === 0) {
    alert(`⚠️ Gagal mengubah status! Karena Anda mengeset Target Brand untuk "${b.name}", Anda diwajibkan mengisi nominal Target Input ACC terlebih dahulu.`);
    return
  }

  const confirmMessage = b.isAcc 
    ? `Apakah Anda yakin ingin MEMBUKA KUNCI status pada brand "${b.name}"?`
    : `Apakah Anda yakin ingin MENGUBAH STATUS dan melakukan ACC Target Final untuk brand "${b.name}"?\n\nTarget ACC: ${fmt(b.targetInputAcc)}\nData ini akan langsung dipasang pada perhitungan Dashboard 2.`;

  const userConfirmed = confirm(confirmMessage)

  if (userConfirmed) {
    b.isAcc = !b.isAcc
    saveRow(b)
    alert(`✅ Berhasil! Status target brand "${b.name}" telah diperbarui dan dikunci.`);
  }
}

function exportDataAktifExcel() {
  const rows = brandRowsLocal.value.map(b => ({
    'Brand': b.name,
    'Target Historis': b.targetHistoris || 0,
    'Target Brand': b.targetManual || 0,
    'Target Final': b.targetFinal
  }))
  exportToExcel(rows, `Report_Target_Brand_${store.targetBulanLabel}.xlsx`)
}

function exportTemplateOnlyExcel() {
  const rows = brandRowsLocal.value.map(b => ({
    'Brand': b.name,
    'Target Brand': b.targetManual || 0
  }))
  exportToExcel(rows, `Template_Import_Target_Brand.xlsx`)
}

function handleImportExcel(e) {
  const files = e.target.files
  if (!files || !files[0]) return
  
  const file = files[0]
  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      
      let countSuccess = 0
      let countChanged = 0
      
      jsonData.forEach(row => {
        const rawBrand = row['Brand'] || row['BRAND'] || row['brand'] || row['Nama Brand']
        const rawTarget = row['Target Brand'] || row['TARGET BRAND'] || row['target brand'] || row['Target']
        
        const cleaned = cleanBrand(rawBrand)
        if (!cleaned) return
        
        const matchedRow = brandRowsLocal.value.find(b => b.name.toUpperCase() === cleaned.toUpperCase())
        if (matchedRow) {
          const targetBaruExcel = Number(rawTarget || 0)
          const targetLamaAplikasi = Number(matchedRow.targetManual || 0)
          
          if (targetBaruExcel !== targetLamaAplikasi) {
            matchedRow.targetManual = targetBaruExcel
            
            if (targetBaruExcel === 0) {
              matchedRow.targetInputAcc = 0
              matchedRow.accMode = 'nilai_tengah'
              matchedRow.isAcc = false
              matchedRow.isForcePending = false
            } else {
              matchedRow.isForcePending = true
              matchedRow.isAcc = false 
              matchedRow.accMode = 'nilai_tengah'
              matchedRow.targetInputAcc = Math.round((matchedRow.targetHistoris + targetBaruExcel) / 2)
            }
            countChanged++
          } else {
            matchedRow.targetManual = targetBaruExcel
          }
          
          saveRow(matchedRow)
          countSuccess++
        }
      })
      
      alert(`🎉 Sukses Sync Excel!\n\n• Total diperiksa: ${countSuccess} Brand\n• Target berubah (Status Reset ke "Ubah Status"): ${countChanged} Brand\n• Target tetap (Status Tetap Terkunci): ${countSuccess - countChanged} Brand`);
      showImportModal.value = false
      
    } catch (err) {
      console.error(err)
      alert('❌ Gagal membaca file Excel! Pastikan file valid.')
    }
  }
  reader.readAsArrayBuffer(file)
}

function fmt(n) { return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID') }
</script>

<style scoped>
.page { padding: 24px; display: flex; flex-direction: column; gap: 16px; background: #f8fafc; min-height: 100vh; position: relative; }
.page-header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; flex-wrap: wrap; gap: 16px; }
.page-header-text { flex: 1; }
.page-title { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
.page-sub { font-size: 12px; color: #64748b; margin-top: 3px; }

.header-action-panel { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.target-pct-group { display: flex; align-items: center; gap: 6px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 6px 10px; }
.target-pct-label { font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
.target-pct-select { padding: 4px 8px; border: 1px solid #93c5fd; border-radius: 5px; font-size: 11px; font-weight: 700; background: #fff; color: #1e3a8a; cursor: pointer; outline: none; height: 29px; }
.target-pct-input-wrap { display: flex; align-items: center; gap: 2px; }
.target-pct-input { width: 52px; padding: 4px 6px; border: 1px solid #93c5fd; border-radius: 5px; font-size: 12px; font-weight: 700; color: #1e3a8a; background: #fff; outline: none; text-align: center; }
.target-pct-input:focus { border-color: #2563eb; }
.target-pct-suffix { font-size: 12px; font-weight: 700; color: #2563eb; }
.target-confirm-btn { background: #16a34a; color: #fff; border: none; border-radius: 5px; width: 28px; height: 28px; font-size: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.target-confirm-btn:hover { background: #15803d; }
.target-locked-btn { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; border-radius: 5px; width: 28px; height: 28px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.target-locked-btn:hover { background: #e2e8f0; color: #475569; }
.btn-action { padding: 8px 16px; font-size: 12px; font-weight: 700; border-radius: 6px; cursor: pointer; border: none; display: inline-flex; align-items: center; transition: all 0.15s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.btn-export { background: #fff; border: 1px solid #cbd5e1; color: #475569; }
.btn-export:hover { background: #f1f5f9; color: #0f172a; border-color: #94a3b8; }
.btn-import { background: #2563eb; color: #fff; }
.btn-import:hover { background: #1d4ed8; }

.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 12px; }

.scoretable-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
.scoretable-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
.scorecard-item { padding: 0 24px; border-right: 1px solid #e2e8f0; }
.scorecard-item:first-child { padding-left: 0; }
.scorecard-item:last-child { border-right: none; }
.scorecard-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 6px; }
.scorecard-value { font-size: 18px; font-weight: 800; color: #0f172a; font-family: 'JetBrains Mono', monospace; }
.scorecard-blue { color: #2563eb; }

.table-header-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.table-title { font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.02em; text-transform: uppercase; }

.filter-controls-group { display: flex; align-items: center; gap: 10px; }
.filter-acc-select { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; outline: none; background: #fff; color: #334155; cursor: pointer; height: 31px; font-weight: 600; }
.search-input { padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; outline: none; width: 220px; height: 31px; }

.table-scroll-container { overflow-x: auto; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; max-height: 65vh; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }

th { 
  background: #2563eb; color: #fff; padding: 14px 14px; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em;
  position: sticky; top: 0; z-index: 10; box-shadow: inset 0 -2px 0 #1e40af; white-space: nowrap;
}
th.sortable { cursor: pointer; user-select: none; transition: background-color 0.15s; }
th.sortable:hover { background-color: #1d4ed8 !important; }

.text-center { text-align: center !important; }
td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; vertical-align: middle; }

.row-locked { background-color: #f8fafc; }
.idx-col { width: 40px; text-align: center; color: #94a3b8; font-weight: 600; }
.brand-name-col { font-weight: 700; color: #0f172a; }
.num { text-align: right; }
.font-mono { font-family: 'JetBrains Mono', monospace; padding: 2px 0; font-size: 12px; }
.bold { font-weight: 700; }
.text-slate { color: #64748b; }
.text-black-normal { color: #1e293b; }
.text-blue-final { color: #2563eb; }

.no-wrap-text { white-space: nowrap !important; word-break: keep-all !important; }

.acc-mode-container { display: flex; align-items: center; gap: 8px; width: 100%; }
.mode-select { padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; font-weight: 600; outline: none; background: #f8fafc; color: #334155; cursor: pointer; width: 150px; }
.mode-select:disabled { background: #e2e8f0; cursor: not-allowed; }

.input-with-prefix { display: flex; align-items: center; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px 8px; gap: 4px; transition: background 0.2s; flex: 1; min-width: 110px; }
.input-with-prefix span { color: #94a3b8; font-weight: 600; font-size: 11px; }
.cell-input { border: none; outline: none; width: 100%; font-size: 12px; font-family: monospace; color: #1e293b; padding: 4px 0; background: transparent; }
.input-disabled { background: #f1f5f9; border-color: #e2e8f0; }
.cell-input:disabled { color: #94a3b8; cursor: not-allowed; }

.btn-auto-trigger { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; cursor: pointer; transition: all 0.2s; }
.btn-auto-trigger:hover { background: #dbeafe; color: #1d4ed8; }

.badge-status { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-block; }
.status-auto { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; white-space: nowrap; }
.text-muted-placeholder { color: #cbd5e1; text-align: center; font-weight: 500; width: 100%; }

.btn-verify { padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid; cursor: pointer; transition: all 0.2s; outline: none; white-space: nowrap; }
.btn-unverified { background: #fff3cd; color: #856404; border-color: #ffeeba; }
.btn-unverified:hover { background: #ffeeba; }
.btn-verified { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }

.no-data { text-align: center; padding: 30px; color: #94a3b8; font-weight: 600; }
.empty { text-align: center; padding: 40px; color: #94a3b8; font-size: 13px; background: #fff; border: 1px dashed #e2e8f0; border-radius: 12px; }

/* Modal Styles */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.4); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(2px); }
.bubble-modal { background: #ffffff; width: 400px; border-radius: 12px; padding: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; animation: scaleUp 0.15s ease-out; }
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
.modal-header h3 { font-size: 15px; font-weight: 800; color: #0f172a; }
.close-btn { background: none; border: none; font-size: 14px; color: #94a3b8; cursor: pointer; font-weight: bold; }
.close-btn:hover { color: #64748b; }
.modal-body { display: flex; flex-direction: column; gap: 16px; }
.instruction { font-size: 12px; color: #64748b; line-height: 1.5; }

.btn-download-template { width: 100%; background: #f1f5f9; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #334155; cursor: pointer; text-align: center; transition: all 0.2s; }
.btn-download-template:hover { background: #e2e8f0; border-color: #94a3b8; color: #0f172a; }

.upload-zone { display: flex; flex-direction: column; gap: 6px; background: #fafafa; padding: 12px; border-radius: 6px; border: 1px solid #f1f5f9; }
.upload-label { font-size: 11px; font-weight: 700; color: #475569; }
.file-picker { font-size: 11px; color: #64748b; cursor: pointer; }

@keyframes scaleUp {
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>