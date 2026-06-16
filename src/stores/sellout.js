// src/stores/sellout.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cleanBrand } from '@/utils/brandCleaner'
import {
  filterHistoris, distribusiTarget, hitungAchievement,
  hitungTargetOtomatis, parseRupiah, BULAN_INDONESIA, get3BulanHistoris, cleanPelanggan,
} from '@/utils/calculations'
import { buildDistributorMap, applyDistributorMapping } from '@/utils/fileReader'

export const useSelloutStore = defineStore('sellout', () => {
  const soBerjalan      = ref([])
  const targetBulan     = ref(0)
  const targetTahun     = ref(0)
  const selectedBrand   = ref('')
  const driveFiles      = ref([])
  const driveConnected  = ref(false)
  const driveError      = ref('')

  // ── Distributor / Data Lokasi ──────────────────────────────────────────────
  const distributorData    = ref([])   // raw rows dari file distributor
  const distributorMapped  = ref(0)    // jumlah SO yang berhasil di-match
  const distributorTotal   = ref(0)    // total SO saat mapping terakhir

  // ── Target Brand Inputs ────────────────────────────────────────────────────
  const targetBrandInputs  = ref({})

  // ── Computed ──────────────────────────────────────────────────────────────

  const dataTarget = computed(() => {
    if (!soBerjalan.value.length || !targetBulan.value || !targetTahun.value) return []
    const defaultTargets = hitungTargetOtomatis(soBerjalan.value, targetBulan.value, targetTahun.value)
    return defaultTargets.map(item => {
      const brandKey   = item.brand.toUpperCase()
      const savedInput = targetBrandInputs.value[brandKey]
      if (savedInput && savedInput.isAcc) {
        return { ...item, target: Number(savedInput.targetInputAcc || 0) }
      }
      return item
    })
  })

  const historisFiltered = computed(() => {
    if (!targetBulan.value || !targetTahun.value || !soBerjalan.value.length) return []
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
      const b = cleanBrand(row['Brand'] || row['BRAND Barang'])
      if (!b) continue
      realMap[b] = (realMap[b] || 0) + (parseRupiah(row['Total'] || row['Jumlah']) || 0)
    }
    return dataTarget.value.map(({ brand, target, avgBulanan }) => {
      const real = realMap[brand.toUpperCase()] || 0
      return { brand, target, avgBulanan, realisasi: real, achievement: target > 0 ? (real/target)*100 : 0 }
    })
  })

  // Computed: apakah mapping distributor sudah dijalankan
  const distributorReady = computed(() => distributorData.value.length > 0)

  // Statistik mapping untuk ditampilkan di UI
  const distributorStats = computed(() => ({
    total:   distributorData.value.length,
    mapped:  distributorMapped.value,
    soTotal: distributorTotal.value,
    pct:     distributorTotal.value > 0
      ? Math.round((distributorMapped.value / distributorTotal.value) * 100)
      : 0,
  }))

  let _cache = {}, _cacheKey = ''
  function _key() { return `${targetBulan.value}-${targetTahun.value}-${soBerjalan.value.length}` }

  function getDistAch(brand) {
    const k = _key()
    if (k !== _cacheKey) { _cache = {}; _cacheKey = k }
    const brandUp = brand.toUpperCase()
    if (!_cache[brandUp]) {
      const dt = dataTarget.value.find(d => d.brand.toUpperCase() === brandUp)
      if (!dt) return { dist: {}, ach: {} }

      const hist = historisFiltered.value.filter(r => {
        const b = cleanBrand(r['Brand'] || r['BRAND Barang'])
        return b && b.toUpperCase() === brandUp
      })
      const real = soTargetBulan.value.filter(r => {
        const b = cleanBrand(r['Brand'] || r['BRAND Barang'])
        return b && b.toUpperCase() === brandUp
      })

      const dist = distribusiTarget(hist, dt.target, brand)

      const dealersInReal = new Set(real.map(r => cleanPelanggan(r)))
      const dealersInDist = new Set(Object.keys(dist))
      for (const dealer of dealersInReal) {
        if (!dealer) continue
        if (!dealersInDist.has(dealer)) {
          dist[dealer] = { pct: 0, target: 0, kategori: {} }
          const dealerRows = real.filter(r => cleanPelanggan(r) === dealer)
          for (const row of dealerRows) {
            const kat = String(row['Kategori'] ?? '').trim()
            if (!dist[dealer].kategori[kat]) dist[dealer].kategori[kat] = { pct:0, target:0, sku:{} }
            const skuNo = String((row['SKU'] || row['No. Barang']) ?? '').trim()
            if (skuNo && !dist[dealer].kategori[kat].sku[skuNo]) {
              const itemNama = String((row['Nama Item'] || row['Nama Barang']) ?? '').trim()
              dist[dealer].kategori[kat].sku[skuNo] = { 
                pct: 0, target: 0, namaBarang: itemNama, namaItem: itemNama
              }
            }
          }
        }
      }

      const ach = hitungAchievement(real, dist, brand)
      _cache[brandUp] = { dist, ach }
    }
    return _cache[brandUp]
  }

  function getAchievement(brand) { return getDistAch(brand).ach }
  function getTarget(brand) {
    return dataTarget.value.find(d => d.brand.toUpperCase() === brand.toUpperCase())?.target ?? 0
  }

  const targetBulanLabel = computed(() =>
    targetBulan.value && targetTahun.value ? `${BULAN_INDONESIA[targetBulan.value]} ${targetTahun.value}` : '-'
  )
  const dataReady = computed(() => soBerjalan.value.length > 0 && targetBulan.value > 0)

  // ── Actions ────────────────────────────────────────────────────────────────
  function setSoBerjalan(rows)  { soBerjalan.value = rows }
  function setTargetBulan(b,t)  { targetBulan.value=b; targetTahun.value=t }
  function setSelectedBrand(b)  { selectedBrand.value=b }
  function setDriveFiles(f)     { driveFiles.value=f }
  function setDriveConnected(v) { driveConnected.value=v }
  function setDriveError(msg)   { driveError.value=msg }

  /**
   * Simpan data distributor ke store dan langsung jalankan mapping ke soBerjalan
   */
  function setDistributorData(rows) {
    distributorData.value = rows

    // Jika sudah ada SO data, langsung jalankan mapping
    if (soBerjalan.value.length > 0) {
      _runMapping()
    }
  }

  /**
   * Jalankan ulang mapping (dipanggil juga saat SO baru di-upload)
   */
  function _runMapping() {
    if (!distributorData.value.length || !soBerjalan.value.length) return
    const distMap = buildDistributorMap(distributorData.value)
    const { rows, mappedCount, totalCount } = applyDistributorMapping(soBerjalan.value, distMap)
    soBerjalan.value = rows
    distributorMapped.value = mappedCount
    distributorTotal.value  = totalCount
    // Reset cache karena data berubah
    _cache = {}; _cacheKey = ''
  }

  /**
   * Dipanggil dari InputData setelah SO di-upload,
   * jika distributor sudah ada maka langsung mapping
   */
  function setSoBerjalanWithMapping(rows) {
    soBerjalan.value = rows
    if (distributorData.value.length > 0) {
      _runMapping()
    }
  }

  function updateTargetBrand(brand, data) {
    targetBrandInputs.value[brand.toUpperCase()] = {
      targetManual:    Number(data.targetManual || 0),
      targetInputAcc:  Number(data.targetInputAcc || 0),
      isAcc:           data.isAcc ?? false,
      accMode:         data.accMode || 'nilai_tengah',
      isForcePending:  data.isForcePending ?? false,
    }
  }

  function reset() { 
    soBerjalan.value       = []
    targetBulan.value      = 0
    targetTahun.value      = 0
    selectedBrand.value    = ''
    targetBrandInputs.value = {}
    distributorData.value  = []
    distributorMapped.value = 0
    distributorTotal.value  = 0
  }

  return {
    soBerjalan, targetBulan, targetTahun, selectedBrand,
    driveFiles, driveConnected, driveError,
    targetBrandInputs,
    distributorData, distributorMapped, distributorTotal,
    distributorReady, distributorStats,
    dataTarget, historisFiltered, soTargetBulan,
    allBrandSummary, brands, targetBulanLabel, dataReady,
    getAchievement, getTarget,
    setSoBerjalan, setSoBerjalanWithMapping, setTargetBulan, setSelectedBrand,
    setDriveFiles, setDriveConnected, setDriveError,
    setDistributorData, updateTargetBrand, reset,
  }
})