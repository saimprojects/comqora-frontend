import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '../src/lib/api'
import {
  billAmounts,
  OrderDocument,
  ReportDocument,
  sampleOrder,
  templates,
} from '../src/features/printing/documents'
import PrintPreview, { loadPrintRows } from '../src/features/printing/PrintPreview'

vi.mock('../src/lib/api', () => ({ api: vi.fn(), all: vi.fn(), privateBlob: vi.fn() }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const brand = { name: 'Studio shop', currency: 'PKR', invoice_footer: 'Thank you.' }

it('opens a usable preview, prints the document and restores the page title', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  const print = vi.spyOn(window, 'print').mockImplementation(() => {})
  const previousTitle = document.title
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><PrintPreview kind="order" sample brandOverride={brand} onClose={() => {}} /></QueryClientProvider>)
  const button = screen.getByRole('button', { name: /Print \/ Save PDF/ })
  await waitFor(() => expect(button.disabled).toBe(false))
  fireEvent.click(button)
  await waitFor(() => expect(print).toHaveBeenCalledOnce())
  expect(document.title).toBe(previousTitle)
  fireEvent.change(screen.getByLabelText('Document'), { target: { value: 'receipt' } })
  expect(screen.getByRole('heading', { name: 'Payment receipt' })).toBeTruthy()
})

it('blocks receipt printing when no payment is recorded', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  api.mockResolvedValue({ ...sampleOrder, advance_paid: '0.00' })
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><PrintPreview kind="order" orderId="unpaid" brandOverride={brand} onClose={() => {}} /></QueryClientProvider>)
  await screen.findByText('Ayesha Khan')
  fireEvent.change(screen.getByLabelText('Document'), { target: { value: 'receipt' } })
  expect(screen.getByRole('alert').textContent).toContain('no positive recorded')
  expect(screen.getByRole('button', {name:/Print \/ Save PDF/}).disabled).toBe(true)
})

it('uses customer charges and decimal arithmetic without including internal costs', () => {
  const order = {
    ...sampleOrder,
    subtotal: '0.30',
    discount: '0.10',
    customer_charges: '0.20',
    advance_paid: '0.10',
    courier_cost: '99999',
    product_cost: '88888',
    financials: { profit: '77777' },
  }
  expect(billAmounts(order)).toEqual({ total: '0.40', retained: '0.10', collection: '0.30' })
  const { container } = render(<OrderDocument brand={brand} order={order} />)
  expect(container.textContent).not.toMatch(/99999|88888|77777|FIFO|profit/)
})

it('prints the complete customer-facing order on every selectable design', () => {
  for (const template of templates) {
    const { unmount } = render(
      <OrderDocument brand={brand} order={sampleOrder} template={template.id} />,
    )
    expect(screen.getByText('Ayesha Khan')).toBeTruthy()
    expect(screen.getByText('4,900.00')).toBeTruthy()
    expect(screen.getByText('3,900.00')).toBeTruthy()
    expect(screen.getByText('Everyday canvas tote')).toBeTruthy()
    unmount()
  }
})

it('prints receipts for recorded advance less refunds and avoids claiming COD receipt', () => {
  render(
    <OrderDocument
      brand={brand}
      order={{ ...sampleOrder, refunded_amount: '250.00', status: 'DELIVERED' }}
      documentType="receipt"
    />,
  )
  expect(screen.getByText('750.00')).toBeTruthy()
  expect(screen.queryByText(/COD at delivery/)).toBeNull()
  expect(screen.getByText(/Courier COD collections are not included/)).toBeTruthy()
})

it('does not request collection on cancelled or returned bills', () => {
  render(<OrderDocument brand={brand} order={{ ...sampleOrder, status: 'CANCELLED' }} />)
  expect(screen.queryByText(/To collect on delivery/)).toBeNull()
  expect(screen.getByText(/Historical order record/)).toBeTruthy()
})

it('prints customer supplied text as text rather than executable markup', () => {
  const { container } = render(
    <OrderDocument
      brand={{ ...brand, name: '<img src=x onerror=alert(1)>' }}
      order={sampleOrder}
    />,
  )
  expect(container.querySelector('img')).toBeNull()
  expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
})

it('includes all filtered pages, preserving search and refusing an incomplete list', async () => {
  api
    .mockResolvedValueOnce({ count: 2, results: [{ id: '1' }], next: 'next' })
    .mockResolvedValueOnce({ count: 2, results: [{ id: '2' }], next: null })
  expect(await loadPrintRows('customers', 'search=A%26B')).toHaveLength(2)
  expect(api.mock.calls.at(-1)[0]).toContain('search=A%26B')
  expect(api.mock.calls.at(-1)[0]).toContain('page=2')
  api.mockResolvedValueOnce({ count: 2, results: [{ id: '1' }], next: null })
  await expect(loadPrintRows('customers', '')).rejects.toThrow('incomplete')
})

it('reports packaging value using stock times unit cost', () => {
  render(
    <ReportDocument
      brand={brand}
      kind="packaging"
      generatedAt="2026-09-17"
      rows={[
        {
          id: '1',
          name: 'Box',
          stock: '3',
          unit: 'piece',
          unit_cost: '0.10',
          default_quantity: '1',
        },
      ]}
    />,
  )
  expect(screen.getAllByText('0.30')).toHaveLength(2)
})
