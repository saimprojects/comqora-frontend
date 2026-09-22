// All data is synthetic and in-memory. This module never sends network requests.
import { bankAccounts, bankEntries, bankSourceImage, bankStatement } from './banking-fixture'
import { managerFixture } from './assistant-fixture'
const manager = managerFixture()
const rows = {
  'bank-accounts': bankAccounts,
  'settlement-imports': [
    bankStatement,
    {
      ...bankStatement,
      id: 'settled-qa',
      status: 'CONFIRMED',
      reference: 'DEMO-000',
      net_amount: '61420.00',
      received_amount: '61420.00',
      remaining_amount: '0.00',
    },
  ],
  'bank-entries': bankEntries,
  categories: [
    { id: 'cat-1', name: 'Electronics' },
    { id: 'cat-2', name: 'Accessories' },
  ],
  products: [
    {
      id: 'product-1',
      name: 'Studio wireless headphones',
      sku: 'AUDIO-01',
      category: 'Electronics',
      category_id: 'cat-1',
      selling_price: '3500',
      available: 42,
      stock: 42,
      reserved: 0,
      low_stock_threshold: 10,
      is_active: true,
    },
    {
      id: 'product-2',
      name: 'Everyday canvas tote',
      sku: 'BAG-02',
      category: 'Accessories',
      category_id: 'cat-2',
      selling_price: '1500',
      available: 8,
      stock: 8,
      reserved: 0,
      low_stock_threshold: 10,
      is_active: true,
    },
  ],
  customers: [
    {
      id: 'customer-1',
      name: 'Sample Customer',
      phone: '03000000000',
      city: 'Kasur',
      province: 'Punjab',
      email: 'sample@example.test',
    },
  ],
  couriers: [
    {
      id: 'courier-1',
      name: 'TCS standard COD',
      provider: 'TCS',
      code: 'tcs',
      base_weight: '.5',
      base_rate: '200',
      additional_kg_rate: '50',
      tax_percent: '0',
      fixed_charge: '0',
      return_rate: '100',
      is_active: true,
      extra_fees: [],
      provincial_pricing: false,
      city_pricing: false,
    },
  ],
  packaging: [
    {
      id: 'pack-1',
      name: 'Courier flyer',
      unit: 'piece',
      unit_cost: '20',
      stock: '100',
      default_quantity: '1',
    },
    {
      id: 'pack-2',
      name: 'Protective wrap',
      unit: 'meter',
      unit_cost: '15',
      stock: '100',
      default_quantity: '1',
    },
  ],
  campaigns: [
    {
      id: 'campaign-1',
      name: 'September launch',
      channel: 'Meta',
      spend: '12000',
      start_date: '2026-09-01',
      end_date: '2026-09-14',
      allocation_count: 0,
      allocated: false,
    },
  ],
  'stock-batches': [],
  orders: [],
  expenses: [],
}
export async function all(resource) {
  return rows[resource] || []
}
export async function api(path) {
  if (path.startsWith('assistant/')) return manager.api(path)
  if (path === 'bank-accounts/summary/')
    return {
      balance: '186420.00',
      awaiting_receipt: '42900.00',
      payable_to_couriers: '0.00',
      review_count: 1,
    }
  if (path === 'settlement-imports/statement-qa/') return bankStatement
  if (path === 'whatsapp/account/')
    return {
      configured: false,
      webhook_configured: false,
      mode: 'PLUS',
      workspace_id: 'preview-workspace',
      account: null,
      events: [
        'CREATED',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERY_FAILED',
        'RETURN_IN_TRANSIT',
        'DELIVERED',
        'RETURNED',
        'CANCELLED',
        'RETURN_RECEIVED',
        'REFUND_RECORDED',
      ],
      default_template: 'Hi {customer}, order {order_number} is {status}.',
      placeholders: ['customer', 'order_number', 'status'],
    }
  if (path.startsWith('whatsapp/')) return []
  if (path.includes('/quote/'))
    return {
      base_rate: '200',
      extra_weight_charge: '0',
      tax: '0',
      fixed_charge: '0',
      extra_fees: [],
      total: '200',
      return_rate: '100',
    }
  if (path === 'workspace/')
    return {
      id: 'brand-qa',
      name: 'Studio Commerce',
      has_logo: false,
      business_address: '18 Main Boulevard, Gulberg III, Lahore',
      business_phone: '+92 300 1234567',
      business_email: 'hello@example.test',
      invoice_template: 'studio',
      invoice_footer: 'Thank you for shopping with us.',
      currency: 'PKR',
      integrations: {
        cloudinary: false,
        tracking: true,
        postex: true,
        email: false,
        tracking_worker: { running: true },
      },
    }
  if (path === 'activity/' || path === 'team/') return []
  const url = new URL(path, 'http://preview.invalid/'),
    resource = url.pathname.split('/')[1]
  let results = rows[resource] || []
  const category = url.searchParams.get('category_record'),
    search = url.searchParams.get('search')?.toLowerCase()
  if (category) results = results.filter((row) => row.category_id === category)
  if (search) results = results.filter((row) => JSON.stringify(row).toLowerCase().includes(search))
  return { results, count: results.length, next: null, previous: null }
}
export async function post(path, data) {
  if (path.startsWith('assistant/')) return manager.post(path, data)
  const resource = path.split('/')[0]
  if (resource === 'categories') {
    const row = { ...data, id: crypto.randomUUID() }
    rows.categories.push(row)
    return row
  }
  throw new Error('Visual preview only. Use the normal application to save real records.')
}
export async function patch(path, data) {
  if (path.startsWith('assistant/')) return manager.patch(path, data)
  throw new Error('Visual preview only. No real records are modified.')
}
export async function exportOrders() {
  throw new Error('Exports are disabled in the fixture preview.')
}
export async function privateBlob() {
  return new Blob([bankSourceImage], { type: 'image/svg+xml' })
}
