// src/router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import InputData       from '@/views/InputData.vue'
import DataDistributor from '@/views/DataDistributor.vue'
import Insight         from '@/views/Insight.vue'
import TargetBrand     from '@/views/TargetBrand.vue'
import Dashboard       from '@/views/Dashboard.vue'
import Dashboard2      from '@/views/Dashboard2.vue'
import PivotTable      from '@/views/PivotTable.vue'

const routes = [
  { path: '/',             redirect: '/input'        },
  { path: '/input',        component: InputData       },
  { path: '/distributor',  component: DataDistributor },
  { path: '/insight',      component: Insight         },
  { path: '/target-brand', component: TargetBrand     },
  { path: '/dashboard',    component: Dashboard       },
  { path: '/dashboard2',   component: Dashboard2      },
  { path: '/pivot',        component: PivotTable      },
]

export default createRouter({ 
  history: createWebHashHistory(), 
  routes 
})