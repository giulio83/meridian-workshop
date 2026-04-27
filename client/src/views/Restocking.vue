<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <!-- Budget input -->
    <div class="card budget-card">
      <div class="budget-row">
        <label class="budget-label">{{ t('restocking.budgetCeiling') }}</label>
        <div class="budget-input-group">
          <span class="currency-prefix">{{ currentCurrency === 'JPY' ? '¥' : '$' }}</span>
          <input
            v-model.number="budgetInput"
            type="number"
            min="0"
            step="1000"
            :placeholder="t('restocking.budgetPlaceholder')"
            class="budget-input"
            @keyup.enter="applyBudget"
          />
          <button class="btn-apply" @click="applyBudget">{{ t('restocking.apply') }}</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <!-- Summary stats -->
      <div class="stats-grid">
        <div class="stat-card" :class="summary.total_items > 0 ? 'danger' : 'success'">
          <div class="stat-label">{{ t('restocking.totalItems') }}</div>
          <div class="stat-value">{{ summary.total_items }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ t('restocking.totalCost') }}</div>
          <div class="stat-value">{{ formatCurrency(summary.total_estimated_cost) }}</div>
        </div>
        <div class="stat-card" :class="activeBudget > 0 ? 'info' : ''">
          <div class="stat-label">{{ t('restocking.withinBudget') }}</div>
          <div class="stat-value">{{ formatCurrency(summary.total_within_budget) }}</div>
        </div>
        <div v-if="activeBudget > 0" class="stat-card" :class="budgetRemaining >= 0 ? 'success' : 'danger'">
          <div class="stat-label">{{ t('restocking.budgetRemaining') }}</div>
          <div class="stat-value">{{ formatCurrency(budgetRemaining) }}</div>
        </div>
      </div>

      <!-- Recommendations table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.title') }}</h3>
          <span class="item-count">{{ recommendations.length }} {{ t('common.items') }}</span>
        </div>

        <div v-if="recommendations.length === 0" class="no-data">
          {{ t('restocking.noRecommendations') }}
        </div>

        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>{{ t('restocking.urgency') }}</th>
                <th>{{ t('restocking.table.sku') }}</th>
                <th>{{ t('restocking.table.item') }}</th>
                <th>{{ t('restocking.table.warehouse') }}</th>
                <th>{{ t('restocking.table.onHand') }}</th>
                <th>{{ t('restocking.table.reorderPoint') }}</th>
                <th>{{ t('restocking.table.shortage') }}</th>
                <th>{{ t('restocking.table.recommendedQty') }}</th>
                <th>{{ t('restocking.table.estimatedCost') }}</th>
                <th>{{ t('restocking.table.demandTrend') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in recommendations"
                :key="item.sku + item.warehouse"
                :class="{ 'row-dimmed': activeBudget > 0 && !item.within_budget }"
              >
                <td>
                  <span :class="urgencyClass(item.urgency)">
                    {{ t('restocking.' + item.urgency) }}
                  </span>
                </td>
                <td class="mono">{{ item.sku }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.warehouse }}</td>
                <td :class="item.quantity_on_hand === 0 ? 'zero-stock' : ''">
                  {{ item.quantity_on_hand }}
                </td>
                <td>{{ item.reorder_point }}</td>
                <td class="shortage-cell">{{ item.shortage }}</td>
                <td><strong>{{ item.recommended_qty }}</strong></td>
                <td :class="activeBudget > 0 && !item.within_budget ? 'over-budget' : 'cost-cell'">
                  {{ formatCurrency(item.estimated_cost) }}
                </td>
                <td>
                  <span :class="trendClass(item.trend)">
                    {{ trendIcon(item.trend) }} {{ t('restocking.' + item.trend) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../api'
import { useFilters } from '../composables/useFilters'
import { useI18n } from '../composables/useI18n'

export default {
  name: 'Restocking',
  setup() {
    const { t, currentCurrency } = useI18n()
    const { selectedWarehouse, selectedCategory, getCurrentFilters } = useFilters()

    const loading = ref(true)
    const error = ref(null)
    const recommendations = ref([])
    const summary = ref({ total_items: 0, total_estimated_cost: 0, total_within_budget: 0, budget: 0 })
    const budgetInput = ref(null)
    const activeBudget = ref(0)

    const budgetRemaining = computed(() => activeBudget.value - summary.value.total_within_budget)

    const formatCurrency = (num) => {
      if (num == null || isNaN(num)) return '-'
      const locale = currentCurrency.value === 'JPY' ? 'ja-JP' : 'en-US'
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currentCurrency.value,
        maximumFractionDigits: 0
      }).format(num)
    }

    const loadData = async () => {
      try {
        loading.value = true
        error.value = null
        const filters = getCurrentFilters()
        const data = await api.getRestockingRecommendations(filters, activeBudget.value || null)
        recommendations.value = data.recommendations
        summary.value = data.summary
      } catch (err) {
        error.value = 'Failed to load recommendations: ' + err.message
      } finally {
        loading.value = false
      }
    }

    const applyBudget = () => {
      activeBudget.value = budgetInput.value || 0
      loadData()
    }

    const urgencyClass = (urgency) => ({
      critical: 'badge danger',
      high: 'badge warning',
      medium: 'badge info'
    }[urgency] || 'badge')

    const trendClass = (trend) => ({
      increasing: 'trend-up',
      decreasing: 'trend-down',
      stable: 'trend-stable'
    }[trend] || '')

    const trendIcon = (trend) => ({
      increasing: '↑',
      decreasing: '↓',
      stable: '→'
    }[trend] || '→')

    watch([selectedWarehouse, selectedCategory], loadData)
    onMounted(loadData)

    return {
      t, currentCurrency,
      loading, error,
      recommendations, summary,
      budgetInput, activeBudget, budgetRemaining,
      formatCurrency, applyBudget,
      urgencyClass, trendClass, trendIcon
    }
  }
}
</script>

<style scoped>
.restocking { padding: 0; }

.budget-card {
  margin-bottom: 1.25rem;
}

.budget-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.budget-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.budget-input-group {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.currency-prefix {
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-right: 1px solid #d1d5db;
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 600;
}

.budget-input {
  padding: 0.5rem 0.75rem;
  border: none;
  outline: none;
  font-size: 0.875rem;
  width: 200px;
  color: #1f2937;
}

.btn-apply {
  padding: 0.5rem 1.25rem;
  background: #2563eb;
  color: white;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-apply:hover { background: #1d4ed8; }

.item-count {
  font-size: 0.875rem;
  color: #64748b;
}

.no-data {
  text-align: center;
  padding: 3rem;
  color: #64748b;
  font-size: 0.938rem;
}

.mono { font-family: monospace; font-size: 0.8125rem; }

.zero-stock { color: #dc2626; font-weight: 700; }

.shortage-cell { color: #ea580c; font-weight: 600; }

.cost-cell { color: #059669; font-weight: 600; }

.over-budget { color: #9ca3af; text-decoration: line-through; }

.row-dimmed { opacity: 0.45; }

.trend-up   { color: #dc2626; font-weight: 600; }
.trend-down { color: #16a34a; font-weight: 600; }
.trend-stable { color: #64748b; }
</style>
