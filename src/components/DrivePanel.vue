<template>
  <div class="drive-panel">
    <!-- Belum login -->
    <template v-if="!connected">
      <div class="login-section">
        <p class="login-desc">
          Klik tombol di bawah untuk login dengan akun Google yang punya akses ke folder Drive.
        </p>
        <button class="btn-google" :disabled="loading" @click="handleLogin">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {{ loading ? 'Membuka popup...' : 'Login dengan Google' }}
        </button>
        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
        <div class="login-note">
          Pastikan akun Google-mu punya akses ke folder Penjualan di Drive.
        </div>
      </div>
    </template>

    <!-- Sudah login -->
    <template v-else>
      <div class="drive-connected">
        <div class="conn-header">
          <span class="conn-dot"></span>
          <span class="conn-label">Terhubung ke Google Drive</span>
          <span class="conn-folder">Folder: Penjualan</span>
          <button class="btn btn-ghost" style="margin-left:auto; padding:5px 12px; font-size:12px"
            @click="loadFiles" :disabled="loadingFiles">
            {{ loadingFiles ? 'Memuat...' : '↻ Refresh' }}
          </button>
          <button class="btn btn-ghost" style="padding:5px 12px; font-size:12px" @click="handleLogout">
            Keluar
          </button>
        </div>

        <div v-if="loadingFiles" class="loading-row">
          <div class="loading-bar"><div class="loading-fill"></div></div>
          <span>Mengambil daftar file...</span>
        </div>

        <div v-else-if="store.driveFiles.length === 0" class="empty-files">
          Tidak ada file di folder Penjualan.
        </div>

        <template v-else>
          <div class="toolbar">
            <div class="toolbar-left">
              <button
                class="btn btn-primary"
                style="padding:6px 14px; font-size:12px"
                :disabled="loadingAll"
                @click="muatSemua"
              >
                {{ loadingAll ? `Memuat ${loadedCount}/${store.driveFiles.length}...` : '⬇ Muat Semua File' }}
              </button>
              <button
                v-if="!loadingAll && loadedAll"
                class="btn btn-ghost"
                style="padding:6px 14px; font-size:12px"
                @click="resetSemua"
              >
                ✕ Reset
              </button>
            </div>
            <div v-if="loadingAll" class="all-progress">
              <div class="all-progress-fill" :style="{ width: (loadedCount / store.driveFiles.length * 100) + '%' }"></div>
            </div>
          </div>

          <div v-if="bulkErrors.length" class="bulk-errors">
            <div class="bulk-err-title">⚠ {{ bulkErrors.length }} file gagal dimuat:</div>
            <div v-for="e in bulkErrors" :key="e" class="bulk-err-item">{{ e }}</div>
          </div>

          <div class="file-list">
            <div
              v-for="file in store.driveFiles"
              :key="file.id"
              class="file-row"
              :class="{
                'file-row--loaded': loadedIds.has(file.id),
                'file-row--error': errorIds.has(file.id),
                'file-row--loading': downloadingId === file.id,
              }"
            >
              <span class="file-icon">
                {{ errorIds.has(file.id) ? '⚠' : loadedIds.has(file.id) ? '✓' : '📄' }}
              </span>
              <div class="file-info">
                <div class="file-fname">{{ file.name }}</div>
                <div class="file-meta">{{ formatDate(file.modifiedTime) }}</div>
              </div>
              <button
                class="btn btn-ghost"
                style="padding:5px 12px; font-size:12px; flex-shrink:0"
                :disabled="downloadingId === file.id || loadingAll"
                @click="downloadAndLoad(file)"
              >
                {{ downloadingId === file.id
                    ? 'Mengunduh...'
                    : loadedIds.has(file.id)
                      ? '↻ Muat Ulang'
                      : 'Muat' }}
              </button>
            </div>
          </div>
        </template>

        <div v-if="downloadError" class="error-msg" style="margin-top:8px">{{ downloadError }}</div>

        <div v-if="store.soBerjalan.length" class="loaded-summary">
          <span class="tag tag-green">✓ {{ store.soBerjalan.length.toLocaleString('id-ID') }} baris dimuat</span>
          <span class="summary-detail">
            dari {{ loadedIds.size }} file ·
            Brand: {{ soberjalanBrands.join(', ') }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSelloutStore } from '@/stores/sellout'
import {
  loginWithGoogle,
  logout,
  isConnected,
  listFilesInFolder,
  readSoBerjalanFromDrive,
  FOLDER_PENJUALAN,
} from '@/utils/gdrive'

const store = useSelloutStore()

const connected     = ref(isConnected())
const loading       = ref(false)
const loadingFiles  = ref(false)
const downloadingId = ref('')
const loadedIds     = ref(new Set())
const errorIds      = ref(new Set())
const errorMsg      = ref('')
const downloadError = ref('')

const loadingAll  = ref(false)
const loadedCount = ref(0)
const loadedAll   = ref(false)
const bulkErrors  = ref([])

const soberjalanBrands = computed(() =>
  [...new Set(store.soBerjalan.map(r => r['BRAND Barang']).filter(Boolean))]
)

async function handleLogin() {
  loading.value  = true
  errorMsg.value = ''
  try {
    await loginWithGoogle()
    connected.value = true
    await loadFiles()
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}

async function loadFiles() {
  loadingFiles.value  = true
  downloadError.value = ''
  try {
    const files = await listFilesInFolder(FOLDER_PENJUALAN)
    store.setDriveFiles(files)
    loadedIds.value  = new Set()
    errorIds.value   = new Set()
    loadedAll.value  = false
    bulkErrors.value = []
  } catch (err) {
    downloadError.value = `Gagal mengambil file: ${err.message}`
  } finally {
    loadingFiles.value = false
  }
}

async function downloadAndLoad(file) {
  downloadingId.value = file.id
  downloadError.value = ''
  try {
    const rows = await readSoBerjalanFromDrive(file.id, file.name)
    store.setSoBerjalan(rows)
    loadedIds.value = new Set([...loadedIds.value, file.id])
    errorIds.value.delete(file.id)
    errorIds.value = new Set(errorIds.value)
  } catch (err) {
    errorIds.value = new Set([...errorIds.value, file.id])
  } finally {
    downloadingId.value = ''
  }
}

async function muatSemua() {
  loadingAll.value  = true
  loadedCount.value = 0
  bulkErrors.value  = []
  loadedIds.value   = new Set()
  errorIds.value    = new Set()
  store.setSoBerjalan([])

  const allRows = []
  for (const file of store.driveFiles) {
    downloadingId.value = file.id
    try {
      const rows = await readSoBerjalanFromDrive(file.id, file.name)
      allRows.push(...rows)
      loadedIds.value = new Set([...loadedIds.value, file.id])
    } catch (err) {
      errorIds.value = new Set([...errorIds.value, file.id])
      bulkErrors.value.push(file.name)
    } finally {
      downloadingId.value = ''
      loadedCount.value++
      store.setSoBerjalan([...allRows])
    }
  }

  loadingAll.value = false
  loadedAll.value  = true
}

function resetSemua() {
  store.setSoBerjalan([])
  loadedIds.value  = new Set()
  errorIds.value   = new Set()
  loadedAll.value  = false
  bulkErrors.value = []
}

function handleLogout() {
  logout()
  connected.value = false
  store.setDriveFiles([])
  store.setSoBerjalan([])
  loadedIds.value  = new Set()
  errorIds.value   = new Set()
  loadedAll.value  = false
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.drive-panel { display: flex; flex-direction: column; gap: 12px; }
.login-section { display: flex; flex-direction: column; gap: 12px; }
.login-desc { font-size: 12px; color: var(--text-secondary); }
.btn-google {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 10px 18px; background: #fff; color: #3c4043;
  border: 1px solid #dadce0; border-radius: 6px;
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background 150ms; width: fit-content;
}
.btn-google:hover:not(:disabled) { background: #f8f9fa; }
.btn-google:disabled { opacity: 0.5; cursor: not-allowed; }
.login-note {
  font-size: 11px; color: var(--text-muted);
  padding: 8px 12px; background: var(--bg-hover);
  border-radius: 6px; border-left: 2px solid var(--border-active);
}
.error-msg { font-size: 12px; color: var(--status-red); }
.drive-connected { display: flex; flex-direction: column; gap: 10px; }
.conn-header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: var(--accent-glow);
  border: 1px solid rgba(110, 231, 183, 0.15);
  border-radius: var(--radius-sm);
}
.conn-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--status-green);
  box-shadow: 0 0 6px var(--status-green); flex-shrink: 0;
}
.conn-label { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.conn-folder { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
.loading-row { display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-muted); }
.loading-bar { flex: 1; height: 2px; background: var(--border); border-radius: 1px; overflow: hidden; }
.loading-fill { height: 100%; background: var(--accent); width: 40%; animation: loading 1s ease-in-out infinite alternate; }
@keyframes loading { from { margin-left: 0% } to { margin-left: 60% } }
.empty-files { font-size: 12px; color: var(--text-muted); padding: 8px 0; }
.toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.toolbar-left { display: flex; gap: 8px; align-items: center; }
.all-progress { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; min-width: 80px; }
.all-progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 300ms ease; }
.bulk-errors {
  padding: 10px 12px; background: var(--status-red-bg);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 4px;
}
.bulk-err-title { font-size: 12px; font-weight: 600; color: var(--status-red); }
.bulk-err-item { font-size: 11px; color: var(--text-secondary); font-family: var(--font-mono); }
.file-list { display: flex; flex-direction: column; gap: 4px; }
.file-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); transition: all var(--transition);
}
.file-row:hover { background: var(--bg-hover); border-color: var(--border-active); }
.file-row--loaded { border-color: rgba(74, 222, 128, 0.3); }
.file-row--error  { border-color: rgba(248, 113, 113, 0.3); }
.file-row--loading { opacity: 0.7; }
.file-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }
.file-info { flex: 1; min-width: 0; }
.file-fname { font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.loaded-summary {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 12px; background: var(--status-green-bg); border-radius: var(--radius-sm);
}
.summary-detail { font-size: 11px; color: var(--text-secondary); font-family: var(--font-mono); }
</style>