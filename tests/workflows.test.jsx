import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import Select from '../src/components/Select'
import { Field } from '../src/components/ui'
import { ThemeProvider, useTheme } from '../src/components/Theme'
import { dateRange } from '../src/lib/dateRanges'
import { orderPreview, landedPreview } from '../src/lib/pricing'
import NewOrder from '../src/features/orders/NewOrder'
import Orders from '../src/features/orders/Orders'
import WhatsApp from '../src/features/whatsapp/WhatsApp'
import ManualMessage from '../src/features/whatsapp/ManualMessage'
import ResourcePage from '../src/features/resources/ResourcePage'
import { api, all, post, patch } from '../src/lib/api'

vi.mock('../src/lib/api', () => ({
  api: vi.fn(),
  all: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  exportOrders: vi.fn(),
}))
vi.mock('../src/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'owner' } }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const fixtures = {
  products: [
    {
      id: 'product-1',
      name: 'Headphones',
      sku: 'HP-1',
      selling_price: '1000',
      available: 20,
      is_active: true,
    },
  ],
  customers: [
    {
      id: 'customer-1',
      name: 'Demo Buyer',
      phone: '03001234567',
      city: 'Kasur',
      province: 'Punjab',
    },
  ],
  couriers: [
    { id: 'courier-1', name: 'TCS standard', provider: 'TCS', base_rate: '200', is_active: true },
  ],
  packaging: [
    { id: 'pack-1', name: 'Flyer', unit_cost: '20', unit: 'piece', default_quantity: '1' },
  ],
  categories: [{ id: 'category-1', name: 'Electronics' }],
}

function mount(element) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  )
}
async function choose(label, option, search) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: label, exact: true }))
  if (search) await user.type(screen.getByPlaceholderText('Type to search…'), search)
  await user.click(screen.getByRole('option', { name: option }))
}
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  all.mockImplementation(async (resource) => fixtures[resource] || [])
  api.mockImplementation(async (url) =>
    url.includes('/quote/')
      ? { total: '200', base_rate: '200', extra_fees: [] }
      : { results: [], count: 0 },
  )
  post.mockResolvedValue({ id: 'saved-1' })
})
afterEach(cleanup)

it('keeps WAHA sends off by default and saves selected notification events', async () => {
  const user = userEvent.setup()
  api.mockResolvedValue({
    configured: false,
    mode: 'PLUS',
    workspace_id: 'test',
    account: null,
    events: ['CREATED', 'OUT_FOR_DELIVERY'],
    placeholders: ['customer'],
    default_template: 'Hello {customer}',
  })
  patch.mockResolvedValue({})
  mount(<WhatsApp />)
  expect((await screen.findByRole('button', { name: 'Connect / start session' })).disabled).toBe(
    true,
  )
  await user.click(screen.getByRole('button', { name: 'Auto messages', exact: true }))
  expect(screen.getByRole('checkbox', { name: 'Enable WhatsApp queue sending' }).checked).toBe(
    false,
  )
  await user.click(screen.getByRole('checkbox', { name: 'out for delivery', exact: true }))
  await user.type(screen.getByLabelText('out for delivery template'), ' — shipped')
  await user.click(screen.getByRole('button', { name: 'Save preferences' }))
  await waitFor(() =>
    expect(patch).toHaveBeenCalledWith(
      'whatsapp/account/',
      expect.objectContaining({ enabled: false, events: ['OUT_FOR_DELIVERY'] }),
    ),
  )
})

it('lists WhatsApp customers without a consent form and confirms removal', async () => {
  const user = userEvent.setup()
  const contact = {
    id: 'contact-1',
    name: 'Demo Buyer',
    phone: '923001234567',
    transactional: true,
    marketing: true,
    opted_out: false,
  }
  api.mockImplementation(async (path) =>
    path === 'whatsapp/account/' ? { account: null, events: [], mode: 'MULTI' } : [contact],
  )
  post.mockImplementation(async () => {
    contact.opted_out = true
    return { detail: 'Removed' }
  })
  mount(<WhatsApp />)
  await user.click(await screen.findByRole('button', { name: 'Customers', exact: true }))
  expect(await screen.findByText('Enabled — orders & products')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Save consent' })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Remove from WhatsApp' }))
  expect(screen.getByRole('button', { name: 'Confirm removal' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Confirm removal' }))
  await waitFor(() => expect(post).toHaveBeenCalledWith('whatsapp/contacts/contact-1/remove/', {}))
  expect(await screen.findByText('Removed / unsubscribed')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Excluded from sending' }).disabled).toBe(true)
})

it('creates a scheduled broadcast for specific recipients without requiring products', async () => {
  const user = userEvent.setup()
  api.mockImplementation(async (path) =>
    path === 'whatsapp/account/'
      ? { account: null, events: [], mode: 'MULTI' }
      : path.startsWith('whatsapp/contacts/')
        ? [
            {
              id: 'contact-1',
              name: 'Demo Buyer',
              phone: '923001234567',
              marketing: true,
              opted_out: false,
            },
          ]
        : path === 'whatsapp/campaigns/'
          ? []
          : { results: [] },
  )
  post.mockResolvedValue({ id: 'draft' })
  mount(<WhatsApp />)
  await user.click(await screen.findByRole('button', { name: 'Broadcast', exact: true }))
  expect(screen.queryByLabelText('Find products')).toBeNull()
  await user.type(screen.getByLabelText('Campaign name'), 'Store update')
  await user.type(screen.getByLabelText('Announcement'), 'We have new opening hours')
  await choose('Send to', 'Specific Customers')
  await choose('Add recipient', /Demo Buyer/)
  await user.click(screen.getByRole('button', { name: 'Create preview draft' }))
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      'whatsapp/campaigns/',
      expect.objectContaining({
        kind: 'BROADCAST',
        audience_mode: 'SPECIFIC',
        recipient_ids: ['contact-1'],
        product_ids: [],
      }),
    ),
  )
})

it('requires a review step before queuing a WhatsApp campaign', async () => {
  const user = userEvent.setup()
  api.mockImplementation(async (path) =>
    path === 'whatsapp/account/'
      ? {
          configured: true,
          mode: 'PLUS',
          workspace_id: 'test',
          account: null,
          events: [],
          placeholders: [],
        }
      : path === 'whatsapp/campaigns/'
        ? [
            {
              id: 'draft-1',
              name: 'New arrivals',
              body: 'Approved text preview',
              state: 'DRAFT',
              counts: {},
              eligible_count: 2,
              scheduled_at: '2026-09-14T12:00:00Z',
            },
          ]
        : { results: [], count: 0 },
  )
  mount(<WhatsApp />)
  await user.click(await screen.findByRole('button', { name: 'Product campaigns', exact: true }))
  expect(await screen.findByText('Approved text preview')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Confirm & queue campaign' })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Review approval' }))
  await user.click(screen.getByRole('button', { name: 'Confirm & queue campaign' }))
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith('whatsapp/campaigns/draft-1/action/', {
      action: 'approve',
      confirm: true,
    }),
  )
})

it('manual WAHA sending opens an editable confirmation before queueing', async () => {
  const user = userEvent.setup()
  mount(
    <ManualMessage
      order={{
        id: 'order-1',
        number: 'SF-1',
        status: 'OUT_FOR_DELIVERY',
        tracking_id: 'TEST',
        customer_snapshot: { name: 'Buyer' },
      }}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'Send via WAHA' }))
  expect(screen.getByLabelText('Message').value).toContain('out for delivery')
  await user.click(screen.getByRole('button', { name: 'Confirm & queue message' }))
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      'whatsapp/messages/',
      expect.objectContaining({ order_id: 'order-1', request_id: expect.any(String) }),
    ),
  )
})

it('offers distinct out-for-delivery and return-in-transit order filters', async () => {
  const user = userEvent.setup()
  mount(<Orders />)
  await user.click(await screen.findByRole('button', { name: 'out for delivery', exact: true }))
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith('orders/?page=1&search=&status=OUT_FOR_DELIVERY'),
  )
  await user.click(screen.getByRole('button', { name: 'return in transit', exact: true }))
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith('orders/?page=1&search=&status=RETURN_IN_TRANSIT'),
  )
})

it('rounds money exactly like the backend instead of binary floating point', () => {
  const preview = orderPreview({
    items: [],
    packaging: [{ unit_cost: '2.01', quantity: '0.5' }],
    mode: 'ADD',
  })
  expect(preview.charges).toBe(1.01)
  expect(preview.netSale).toBe(1.01)
  expect(landedPreview({ quantity: 10, amount: '10.05', mode: 'TOTAL' })).toBe(1.01)
})

describe('Searchable select', () => {
  it('searches labels, supports keyboard selection and submits native form data', async () => {
    const user = userEvent.setup(),
      submit = vi.fn()
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(Object.fromEntries(new FormData(e.currentTarget)))
        }}
      >
        <Field label="Customer">
          <Select name="customer" required>
            <option value="">Select customer</option>
            <option value="buyer">Demo Buyer · 03001234567 · Kasur</option>
            <option value="other">Another · Lahore</option>
          </Select>
        </Field>
        <button>Save</button>
      </form>,
    )
    await user.click(screen.getByRole('combobox', { name: 'Customer' }))
    await user.type(screen.getByPlaceholderText('Type to search…'), '1234567')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(submit).toHaveBeenCalledWith({ customer: 'buyer' })
  })
  it('handles no matches and Escape without dismissing the parent form', async () => {
    const user = userEvent.setup()
    render(
      <Select aria-label="Products">
        <option value="one">Headphones</option>
      </Select>,
    )
    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByPlaceholderText('Type to search…'), 'missing')
    expect(screen.getByText('No matches. Try a different search.')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false')
  })
})

describe('Order workflow', () => {
  it('defaults to half kg and one package; toggles added charges and submits consistent prepaid amount', async () => {
    const user = userEvent.setup()
    mount(<NewOrder onClose={() => {}} />)
    await screen.findByRole('combobox', { name: 'Customer' })
    expect(screen.getByLabelText('Parcel weight (kg)').value).toBe('0.5')
    expect(screen.getByLabelText('Flyer quantity').value).toBe('1')
    await choose('Customer', /Demo Buyer/, 'Kasur')
    await choose('Product 1', /Headphones/, 'HP-1')
    await choose('Courier contract', /TCS standard/)
    await user.click(screen.getByRole('button', { name: 'Increase Flyer quantity' }))
    expect(screen.getByLabelText('Flyer quantity').value).toBe('2')
    await user.click(screen.getByRole('button', { name: 'Add to net sale', exact: true }))
    await choose('Payment type', 'Fully prepaid')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Create order/ }).disabled).toBe(false),
    )
    await user.click(screen.getByRole('button', { name: /Create order/ }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toMatchObject({
      charges_mode: 'ADD',
      weight: '0.5',
      advance_paid: '1240.00',
      customer: 'customer-1',
      packaging: [{ id: 'pack-1', quantity: '2' }],
    })
  })
  it('keeps charges absorbed by default and supports removing packaging', async () => {
    const user = userEvent.setup()
    mount(<NewOrder onClose={() => {}} />)
    await screen.findByLabelText('Flyer quantity')
    expect(
      screen.getByRole('button', { name: 'Deduct from sale' }).getAttribute('aria-pressed'),
    ).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Decrease Flyer quantity' }))
    expect(screen.getByLabelText('Flyer quantity').value).toBe('0')
  })
})

describe('Resource forms', () => {
  it('creates a category inline, selects it and omits variants', async () => {
    const user = userEvent.setup()
    post.mockResolvedValue({ id: 'new-category', name: 'Audio' })
    mount(<ResourcePage resource="products" />)
    await user.click(screen.getByRole('button', { name: 'Add product', exact: true }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByLabelText('Variant')).toBeNull()
    await user.click(screen.getByRole('button', { name: '+ Create new category' }))
    await user.type(screen.getByLabelText('New category name'), 'Audio')
    await user.click(screen.getByRole('button', { name: 'Create', exact: true }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('categories/', { name: 'Audio' }))
    expect(screen.getByRole('button', { name: 'Save product' }).disabled).toBe(false)
  })
  it('calculates total receipt amount with named costs and submits the selected mode', async () => {
    const user = userEvent.setup()
    mount(<ResourcePage resource="inventory" />)
    await user.click(screen.getByRole('button', { name: 'Add stock receipt', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Total pieces amount' }))
    await choose('Product', /Headphones/)
    await user.type(screen.getByLabelText('Purchase reference'), 'BATCH-TEST')
    await user.type(screen.getByLabelText('Quantity received'), '10')
    await user.type(screen.getByLabelText('Total purchase amount (PKR)'), '1000')
    await user.clear(screen.getByLabelText('Total transport cost (PKR)'))
    await user.type(screen.getByLabelText('Total transport cost (PKR)'), '100')
    await user.click(screen.getByRole('button', { name: 'Add charge' }))
    await user.type(screen.getByLabelText('Charge 1'), 'Handling')
    await user.clear(screen.getByLabelText('Amount (PKR)'))
    await user.type(screen.getByLabelText('Amount (PKR)'), '50')
    expect(screen.getByText('Rs 115')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Save stock receipt' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        'stock-batches/',
        expect.objectContaining({
          purchase_mode: 'TOTAL',
          purchase_amount: '1000',
          extra_costs: [{ name: 'Handling', amount: '50' }],
        }),
      ),
    )
  })
  it('reveals optional regional rates and percentage fee controls', async () => {
    const user = userEvent.setup()
    mount(<ResourcePage resource="couriers" />)
    await user.click(screen.getByRole('button', { name: 'Add courier contract', exact: true }))
    expect(screen.getByLabelText('Base weight (kg)').value).toBe('0.5')
    expect(screen.queryByLabelText('Same city base rate (PKR)')).toBeNull()
    await user.click(screen.getByRole('checkbox', { name: /Provincial pricing/ }))
    await user.click(screen.getByRole('checkbox', { name: /Same-city pricing/ }))
    expect(screen.getByLabelText('Same province base rate (PKR)')).toBeTruthy()
    expect(screen.getByLabelText('Same city base rate (PKR)')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Add charge' }))
    await user.click(screen.getByRole('button', { name: '%', exact: true }))
    expect(screen.getByLabelText('Percentage').max).toBe('100')
  })
  it('applies Yesterday to marketing form dates', async () => {
    const user = userEvent.setup()
    mount(<ResourcePage resource="marketing" />)
    await user.click(screen.getByRole('button', { name: 'Add campaign', exact: true }))
    await choose('Campaign date range', 'Yesterday')
    expect(screen.getByLabelText('Start date').value).toBe(dateRange('yesterday').start_date)
    expect(screen.getByLabelText('End date').value).toBe(dateRange('yesterday').end_date)
  })
})

it('persists light/dark appearance across remounts', async () => {
  const user = userEvent.setup()
  function ThemeControl() {
    const { theme, setTheme } = useTheme()
    return <button onClick={() => setTheme('dark')}>{theme}</button>
  }
  const result = render(
    <ThemeProvider>
      <ThemeControl />
    </ThemeProvider>,
  )
  await user.click(screen.getByRole('button'))
  expect(document.documentElement.dataset.theme).toBe('dark')
  result.unmount()
  render(
    <ThemeProvider>
      <ThemeControl />
    </ThemeProvider>,
  )
  expect(screen.getByRole('button').textContent).toBe('dark')
})

it('uses Pakistan calendar dates across UTC, month and week boundaries', () => {
  expect(dateRange('today', new Date('2026-09-13T23:30:00Z'))).toEqual({
    start_date: '2026-09-14',
    end_date: '2026-09-14',
  })
  expect(dateRange('week', new Date('2026-09-13T08:00:00Z')).start_date).toBe('2026-09-07')
  expect(dateRange('last_month', new Date('2026-03-31T08:00:00Z'))).toEqual({
    start_date: '2026-02-01',
    end_date: '2026-02-28',
  })
})
