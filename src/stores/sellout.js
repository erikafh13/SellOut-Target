// src/stores/sellout.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cleanBrand, cleanPelanggan } from '@/utils/brandCleaner'
import {
  filterHistoris, distribusiTarget, hitungAchievement, hitungTargetOtomatis,
  parseRupiah, getPeriodeHistoris, BULAN_INDONESIA,
} from '@/utils/calculations'
import { buildDistributorMap, applyDistributorMapping } from '@/utils/fileReader'

export const useSelloutStore = defineStore('sellout', () => {
  const soBerjalan     = ref([])
  const targetBulan    = ref(0)
  const targetTahun    = ref(0)
  const selectedBrand  = ref('')
  const driveFiles     = ref([])
  const driveConnected = ref(false)
  const driveError     = ref('')

  // ── Distributor / data lokasi ──────────────────────────────────────────────
  const distributorData   = ref([])
  const distributorMapped = ref(0)
  const distributorTotal  = ref(0)

  // ── Input target manual per brand ──────────────────────────────────────────
  const targetBrandInputs = ref({})

  // ── Computed ───────────────────────────────────────────────────────────────

  const dataReady = computed(() => soBerjalan.value.length > 0 && targetBulan.value > 0)

  /** Periode historis yang dipakai — panjangnya mengikuti data yang tersedia. */
  const periodeHistoris = computed(() => {
    if (!dataReady.value) return []
    return getPeriodeHistoris(soBerjalan.value, targetBulan.value, targetTahun.value)
  })

  const dataTarget = computed(() => {
    if (!dataReady.value || !targetTahun.value) return []
    return hitungTargetOtomatis(soBerjalan.value, targetBulan.value, targetTahun.value)
      .map(item => {
        const input = targetBrandInputs.value[item.brand.toUpperCase()]
        return input?.isAcc
          ? { ...item, target: Number(input.targetInputAcc || 0) }
          : item
      })
  })

  const historisFiltered = computed(() => {
    if (!dataReady.value) return []
    return filterHistoris(soBerjalan.value, targetBulan.value, targetTahun.value)
  })

  const soTargetBulan = computed(() => {
    if (!targetBulan.value || !targetTahun.value) return []
    const nama = BULAN_INDONESIA[targetBulan.value]
    return soBerjalan.value.filter(r =>
      String(r['Bulan'] ?? '').toUpperCase() === nama &&
      Number(r['Tahun']) === Number(targetTahun.value)
    )
  })

  const brands = computed(() => dataTarget.value.map(d => d.brand))

  const allBrandSummary = computed(() => {
    const realMap = {}
    for (const row of soTargetBulan.value) {
      const b = cleanBrand(row['Brand'] ?? row['BRAND Barang'])
      if (!b) continue
      realMap[b] = (realMap[b] ?? 0) + (parseRupiah(row['Total'] ?? row['Jumlah']) || 0)
    }
    return dataTarget.value.map(item => {
      const realisasi = realMap[item.brand.toUpperCase()] ?? 0
      return {
        ...item,
        realisasi,
        achievement: item.target > 0 ? (realisasi / item.target) * 100 : 0,
      }
    })
  })

  const distributorReady = computed(() => distributorData.value.length > 0)

  const distributorStats = computed(() => ({
    total:   distributorData.value.length,
    mapped:  distributorMapped.value,
    soTotal: distributorTotal.value,
    pct: distributorTotal.value > 0
      ? Math.round((distributorMapped.value / distributorTotal.value) * 100)
      : 0,
  }))

  const targetBulanLabel = computed(() =>
    targetBulan.value && targetTahun.value
      ? `${BULAN_INDONESIA[targetBulan.value]} ${targetTahun.value}`
      : '-'
  )

  // ── Cache distribusi & achievement ─────────────────────────────────────────
  // Kunci cache memuat nilai target brand-nya. Versi lama hanya memakai
  // bulan/tahun/jumlah baris, sehingga mengubah target lewat halaman Target
  // Brand tidak pernah menghitung ulang distribusi — angkanya tetap yang lama.

  let _cache = new Map()
  let _cacheScope = ''

  function _scope() {
    return `${targetBulan.value}-${targetTahun.value}-${soBerjalan.value.length}`
  }

  function getDistAch(brand) {
    const scope = _scope()
    if (scope !== _cacheScope) { _cache = new Map(); _cacheScope = scope }

    const brandUp = String(brand).toUpperCase()
    const dt = dataTarget.value.find(d => d.brand.toUpperCase() === brandUp)
    if (!dt) return { dist: {}, ach: {} }

    const cacheKey = `${brandUp}|${dt.target}`
    const cached = _cache.get(cacheKey)
    if (cached) return cached

    const dist = distribusiTarget(historisFiltered.value, dt.target, brandUp)

    // Dealer yang muncul di bulan berjalan tapi tidak ada di historis:
    // targetnya 0, tapi tetap perlu tampil supaya realisasinya tidak hilang.
    const rowsBrand = soTargetBulan.value.filter(r => {
      const b = cleanBrand(r['Brand'] ?? r['BRAND Barang'])
      return b && b.toUpperCase() === brandUp
    })

    for (const row of rowsBrand) {
      const dealer = cleanPelanggan(row)
      if (!dealer) continue
      if (!dist[dealer]) dist[dealer] = { pct: 0, target: 0, kategori: {} }

      const kat = String(row['Kategori'] ?? '').trim()
      if (!dist[dealer].kategori[kat]) {
        dist[dealer].kategori[kat] = { pct: 0, target: 0, sku: {} }
      }

      const sku = String(row['SKU'] ?? row['No. Barang'] ?? '').trim()
      if (sku && !dist[dealer].kategori[kat].sku[sku]) {
        const nama = String(row['Nama Item'] ?? row['Nama Barang'] ?? '').trim()
        dist[dealer].kategori[kat].sku[sku] = { pct: 0, target: 0, namaItem: nama }
      }
    }

    const hasil = { dist, ach: hitungAchievement(rowsBrand, dist, brandUp) }
    _cache.set(cacheKey, hasil)
    return hasil
  }

  function getAchievement(brand) { return getDistAch(brand).ach }
  function getDistribusi(brand)  { return getDistAch(brand).dist }

  function getTarget(brand) {
    const b = String(brand).toUpperCase()
    return dataTarget.value.find(d => d.brand.toUpperCase() === b)?.target ?? 0
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function _resetCache() { _cache = new Map(); _cacheScope = '' }

  function _runMapping() {
    if (!distributorData.value.length || !soBerjalan.value.length) return
    const distMap = buildDistributorMap(distributorData.value)
    const { rows, mappedCount, totalCount } = applyDistributorMapping(soBerjalan.value, distMap)
    soBerjalan.value = rows
    distributorMapped.value = mappedCount
    distributorTotal.value = totalCount
    _resetCache()
  }

  function setSoBerjalan(rows) {
    soBerjalan.value = rows
    _resetCache()
    if (distributorData.value.length) _runMapping()
  }

  // Alias lama — perilakunya kini sama dengan setSoBerjalan
  const setSoBerjalanWithMapping = setSoBerjalan

  function setDistributorData(rows) {
    distributorData.value = rows
    if (soBerjalan.value.length) _runMapping()
  }

  function setTargetBulan(bulan, tahun) {
    targetBulan.value = Number(bulan)
    targetTahun.value = Number(tahun)
    _resetCache()
  }

  function updateTargetBrand(brand, data) {
    targetBrandInputs.value[String(brand).toUpperCase()] = {
      targetManual:   Number(data.targetManual || 0),
      targetInputAcc: Number(data.targetInputAcc || 0),
      isAcc:          data.isAcc ?? false,
      accMode:        data.accMode || 'nilai_tengah',
      isForcePending: data.isForcePending ?? false,
    }
  }

  function setSelectedBrand(b)  { selectedBrand.value = b }
  function setDriveFiles(f)     { driveFiles.value = f }
  function setDriveConnected(v) { driveConnected.value = v }
  function setDriveError(msg)   { driveError.value = msg }

  function reset() {
    soBerjalan.value = []
    targetBulan.value = 0
    targetTahun.value = 0
    selectedBrand.value = ''
    targetBrandInputs.value = {}
    distributorData.value = []
    distributorMapped.value = 0
    distributorTotal.value = 0
    _resetCache()
  }

  return {
    soBerjalan, targetBulan, targetTahun, selectedBrand,
    driveFiles, driveConnected, driveError, targetBrandInputs,
    distributorData, distributorMapped, distributorTotal,
    distributorReady, distributorStats,
    dataTarget, historisFiltered, soTargetBulan, periodeHistoris,
    allBrandSummary, brands, targetBulanLabel, dataReady,
    getAchievement, getDistribusi, getTarget,
    setSoBerjalan, setSoBerjalanWithMapping, setTargetBulan, setSelectedBrand,
    setDriveFiles, setDriveConnected, setDriveError,
    setDistributorData, updateTargetBrand, reset,
  }
})
