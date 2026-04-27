<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ mode === 'create' ? 'Create Purchase Order' : 'Purchase Order Details' }}</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- Backlog item summary -->
        <div v-if="backlogItem" class="item-summary">
          <div class="summary-row">
            <span class="label">SKU</span>
            <span>{{ backlogItem.item_sku }}</span>
          </div>
          <div class="summary-row">
            <span class="label">Item</span>
            <span>{{ backlogItem.item_name }}</span>
          </div>
          <div class="summary-row">
            <span class="label">Shortage</span>
            <span class="shortage">{{ backlogItem.quantity_needed - backlogItem.quantity_available }} units</span>
          </div>
        </div>

        <!-- Create mode: form -->
        <template v-if="mode === 'create'">
          <div class="form-group">
            <label>Supplier</label>
            <input v-model="form.supplier" type="text" placeholder="Enter supplier name" class="form-input" />
          </div>
          <div class="form-group">
            <label>Quantity to Order</label>
            <input v-model.number="form.quantity" type="number" min="1" class="form-input" />
          </div>
          <div class="form-group">
            <label>Unit Cost ($)</label>
            <input v-model.number="form.unit_cost" type="number" min="0" step="0.01" class="form-input" />
          </div>
          <div class="form-group">
            <label>Expected Delivery</label>
            <input v-model="form.expected_delivery" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="form.notes" rows="3" placeholder="Optional notes" class="form-input"></textarea>
          </div>
          <div v-if="formError" class="form-error">{{ formError }}</div>
        </template>

        <!-- View mode: read-only PO details -->
        <template v-else>
          <div v-if="loadingPO" class="loading">Loading...</div>
          <div v-else-if="poData" class="po-details">
            <div class="summary-row"><span class="label">PO ID</span><span>{{ poData.id }}</span></div>
            <div class="summary-row"><span class="label">Supplier</span><span>{{ poData.supplier }}</span></div>
            <div class="summary-row"><span class="label">Quantity</span><span>{{ poData.quantity }}</span></div>
            <div class="summary-row"><span class="label">Unit Cost</span><span>${{ poData.unit_cost }}</span></div>
            <div class="summary-row"><span class="label">Total</span><span>${{ (poData.quantity * poData.unit_cost).toFixed(2) }}</span></div>
            <div class="summary-row"><span class="label">Expected Delivery</span><span>{{ poData.expected_delivery }}</span></div>
            <div class="summary-row"><span class="label">Status</span><span :class="'badge ' + poData.status.toLowerCase()">{{ poData.status }}</span></div>
            <div v-if="poData.notes" class="summary-row"><span class="label">Notes</span><span>{{ poData.notes }}</span></div>
          </div>
          <div v-else class="no-po">No purchase order found for this item.</div>
        </template>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Close</button>
        <button v-if="mode === 'create'" class="btn-primary" :disabled="submitting" @click="submit">
          {{ submitting ? 'Creating...' : 'Create PO' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'
import { api } from '../api'

export default {
  name: 'PurchaseOrderModal',
  props: {
    isOpen: { type: Boolean, default: false },
    backlogItem: { type: Object, default: null },
    mode: { type: String, default: 'create' }
  },
  emits: ['close', 'po-created'],
  setup(props, { emit }) {
    const form = ref({ supplier: '', quantity: 0, unit_cost: 0, expected_delivery: '', notes: '' })
    const formError = ref(null)
    const submitting = ref(false)
    const loadingPO = ref(false)
    const poData = ref(null)

    watch(() => props.isOpen, (open) => {
      if (!open) return
      formError.value = null
      if (props.mode === 'create' && props.backlogItem) {
        form.value = {
          supplier: '',
          quantity: props.backlogItem.quantity_needed - props.backlogItem.quantity_available,
          unit_cost: 0,
          expected_delivery: '',
          notes: ''
        }
      } else if (props.mode === 'view' && props.backlogItem) {
        loadingPO.value = true
        api.getPurchaseOrderByBacklogItem(props.backlogItem.id)
          .then(data => { poData.value = data })
          .catch(() => { poData.value = null })
          .finally(() => { loadingPO.value = false })
      }
    })

    const submit = async () => {
      if (!form.value.supplier.trim()) { formError.value = 'Supplier is required.'; return }
      if (!form.value.quantity || form.value.quantity < 1) { formError.value = 'Quantity must be at least 1.'; return }
      if (!form.value.expected_delivery) { formError.value = 'Expected delivery date is required.'; return }
      formError.value = null
      submitting.value = true
      try {
        const po = await api.createPurchaseOrder({
          backlog_item_id: props.backlogItem.id,
          item_sku: props.backlogItem.item_sku,
          item_name: props.backlogItem.item_name,
          ...form.value
        })
        emit('po-created', po)
      } catch (err) {
        formError.value = 'Failed to create purchase order: ' + err.message
      } finally {
        submitting.value = false
      }
    }

    return { form, formError, submitting, loadingPO, poData, submit }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 480px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  line-height: 1;
  padding: 0 0.25rem;
}

.close-btn:hover { color: #0f172a; }

.modal-body { padding: 1.5rem; }

.item-summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.25rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
  font-size: 0.875rem;
  border-bottom: 1px solid #f1f5f9;
}

.summary-row:last-child { border-bottom: none; }

.label {
  color: #64748b;
  font-weight: 500;
}

.shortage { color: #dc2626; font-weight: 600; }

.form-group { margin-bottom: 1rem; }

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.375rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #1f2937;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus { border-color: #3b82f6; }

textarea.form-input { resize: vertical; }

.form-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.po-details { display: flex; flex-direction: column; gap: 0; }

.no-po { text-align: center; color: #64748b; padding: 2rem; }

.loading { text-align: center; color: #64748b; padding: 2rem; }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-secondary:hover { background: #f9fafb; }
</style>
