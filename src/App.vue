<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-mark">S</div>
        <div>
          <div class="logo-title">SellOut</div>
          <div class="logo-sub">Monitor & Target</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/input" class="nav-item" active-class="nav-item--active">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg>
          Input Data
        </router-link>

        <router-link to="/distributor" class="nav-item" active-class="nav-item--active">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
          </svg>
          Data Distributor
          <span class="nav-badge" v-if="store.distributorReady">{{ store.distributorData.length }}</span>
        </router-link>

        <router-link
          to="/insight"
          class="nav-item"
          active-class="nav-item--active"
          :class="{ 'nav-item--disabled': !store.dataReady }"
          @click.prevent="store.dataReady && $router.push('/insight')"
        >
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
          Insight
        </router-link>

        <router-link
          to="/target-brand"
          class="nav-item"
          active-class="nav-item--active"
          :class="{ 'nav-item--disabled': !store.dataReady }"
          @click.prevent="store.dataReady && $router.push('/target-brand')"
        >
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/></svg>
          Target Brand
        </router-link>

        <div class="nav-group-label">Dashboard</div>

        <router-link
          to="/dashboard"
          class="nav-item nav-sub"
          active-class="nav-item--active"
          :class="{ 'nav-item--disabled': !store.dataReady }"
          @click.prevent="store.dataReady && $router.push('/dashboard')"
        >
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>
          By Brand/Kategori
        </router-link>

        <router-link
          to="/dashboard2"
          class="nav-item nav-sub"
          active-class="nav-item--active"
          :class="{ 'nav-item--disabled': !store.dataReady }"
          @click.prevent="store.dataReady && $router.push('/dashboard2')"
        >
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z"/></svg>
          By Dealer
        </router-link>

        <router-link
          to="/pivot"
          class="nav-item nav-sub"
          active-class="nav-item--active"
          :class="{ 'nav-item--disabled': !store.soBerjalan.length }"
          @click.prevent="store.soBerjalan.length && $router.push('/pivot')"
        >
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5zm1 2h8v2H6V6zm0 4h2v4H6v-4zm4 0h4v4h-4v-4z" clip-rule="evenodd"/>
          </svg>
          Pivot Table
        </router-link>
      </nav>

      <div class="sidebar-status">
        <div class="status-item">
          <span class="dot" :class="store.soBerjalan.length ? 'dot-green' : 'dot-gray'"></span>
          <span class="status-label">SO Berjalan</span>
          <span class="status-val" v-if="store.soBerjalan.length">
            {{ store.soBerjalan.length.toLocaleString('id-ID') }} baris
          </span>
        </div>
        <div class="status-item" v-if="store.distributorReady">
          <span class="dot dot-purple"></span>
          <span class="status-label">Distributor</span>
          <span class="status-val purple">{{ store.distributorStats.pct }}% mapped</span>
        </div>
        <div class="status-item" v-if="store.targetBulan">
          <span class="dot dot-blue"></span>
          <span class="status-label">Target</span>
          <span class="status-val blue">{{ store.targetBulanLabel }}</span>
        </div>
        <div class="status-item" v-if="store.dataTarget.length">
          <span class="dot dot-blue"></span>
          <span class="status-label">Brand</span>
          <span class="status-val blue">{{ store.dataTarget.length }} brand</span>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <router-view v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { useSelloutStore } from '@/stores/sellout'
const store = useSelloutStore()
</script>

<style scoped>
.app-shell { display:flex; min-height:100vh; background:#f0f4f8; }

.sidebar {
  width:216px; min-height:100vh; background:#fff;
  border-right:1px solid #e2e8f0; display:flex; flex-direction:column;
  padding:0; position:sticky; top:0; height:100vh; overflow-y:auto; flex-shrink:0;
  box-shadow: 2px 0 8px rgba(0,0,0,.04);
}

.sidebar-logo {
  display:flex; align-items:center; gap:10px;
  padding:20px 16px 18px; border-bottom:1px solid #e2e8f0;
}
.logo-mark  { width:32px; height:32px; border-radius:8px; background:#2563eb; color:#fff; font-weight:800; font-size:18px; display:flex; align-items:center; justify-content:center; }
.logo-title { font-size:15px; font-weight:800; color:#0f172a; letter-spacing:-0.03em; }
.logo-sub   { font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; }

.sidebar-nav { padding:12px 8px; display:flex; flex-direction:column; gap:2px; flex:1; }
.nav-group-label { font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.1em; padding:10px 10px 4px; margin-top:4px; }
.nav-item {
  display:flex; align-items:center; gap:8px; padding:9px 10px;
  border-radius:8px; color:#64748b; text-decoration:none;
  font-size:13px; font-weight:500; transition:all .15s; cursor:pointer;
}
.nav-item:hover         { background:#eff6ff; color:#2563eb; }
.nav-item--active       { background:#eff6ff; color:#2563eb; font-weight:600; }
.nav-item--disabled     { opacity:.4; cursor:not-allowed; pointer-events:none; }
.nav-sub  { padding-left:18px; font-size:12px; }
.nav-icon { width:16px; height:16px; flex-shrink:0; }
.nav-badge { margin-left:auto; font-size:10px; font-weight:700; background:#7c3aed; color:#fff; border-radius:99px; padding:1px 6px; font-family:monospace; }

.sidebar-status { padding:12px 16px 20px; border-top:1px solid #e2e8f0; display:flex; flex-direction:column; gap:8px; }
.status-item  { display:flex; align-items:center; gap:8px; font-size:11px; }
.dot          { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
.dot-green    { background:#16a34a; box-shadow:0 0 4px #16a34a; }
.dot-gray     { background:#cbd5e1; }
.dot-blue     { background:#2563eb; }
.dot-purple   { background:#7c3aed; box-shadow:0 0 4px #7c3aed; }
.status-label { color:#64748b; flex:1; }
.status-val   { color:#94a3b8; font-family:monospace; font-size:10px; }
.status-val.blue   { color:#2563eb; font-weight:600; }
.status-val.purple { color:#7c3aed; font-weight:600; }

.main-content { flex:1; overflow-y:auto; min-width:0; }
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>