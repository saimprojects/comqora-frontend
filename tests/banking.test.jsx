import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import Bank, { CashModal, FinanceGate } from '../src/features/banking/Bank'
import { ReviewEditor } from '../src/features/banking/SettlementReview'
import { api, all, post, privateBlob } from '../src/lib/api'

const auth = vi.hoisted(() => ({ user: { role: 'owner' } }))
vi.mock('../src/features/auth/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../src/lib/api', () => ({
  api: vi.fn(),
  all: vi.fn(),
  post: vi.fn(),
  privateBlob: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
const statement = {
  id: 'test-statement',
  status: 'REVIEW',
  revision: 1,
  filename: 'sample.pdf',
  page_count: 1,
  extracted: {
    pages: [{ text: 'Sample source evidence', width: 600, height: 800 }],
    warnings: [],
    summary_candidates: [],
  },
  review: {
    reference: 'CPR-1',
    date: '2026-09-10',
    declared_net: '900.00',
    currency: 'PKR',
    declared_gross: '1000.00',
    adjustments: [],
    checks: [],
    update_costs: false,
    source_confirmed: true,
    ownership_confirmed: true,
    tables: [
      {
        columns: [
          { label: 'Tracking', role: 'tracking' },
          { label: 'COD', role: 'gross' },
          { label: 'Fee', role: 'fee' },
          { label: 'Net', role: 'net' },
        ],
        rows: [{ values: ['CN001', '1000.00', '100.00', '900.00'], page: 1, external: false }],
      },
    ],
  },
  validation: {
    valid: true,
    errors: [],
    warnings: [],
    gross: '1000.00',
    net: '900.00',
    matched: 1,
    row_count: 1,
    rows: [],
  },
}
function mount(node) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  URL.createObjectURL = vi.fn(() => 'blob:preview-test')
  URL.revokeObjectURL = vi.fn()
  auth.user.role = 'owner'
  all.mockReset().mockResolvedValue([])
  api
    .mockReset()
    .mockImplementation((path) =>
      Promise.resolve(
        path === 'bank-accounts/summary/'
          ? { balance: '100', awaiting_receipt: '900', payable_to_couriers: '0', review_count: 1 }
          : { results: [], count: 0 },
      ),
    )
  post.mockReset()
  privateBlob.mockReset().mockResolvedValue(new Blob(['image']))
})
afterEach(cleanup)

it('restricts private banking to workspace owners and managers', () => {
  auth.user.role = 'staff'
  mount(
    <FinanceGate>
      <p>Private financial data</p>
    </FinanceGate>,
  )
  expect(screen.getByText('Financial access is restricted')).toBeTruthy()
  expect(screen.queryByText('Private financial data')).toBeNull()
})
it('shows cash and receivables separately without uploading or posting automatically', async () => {
  mount(<Bank />)
  await screen.findByText('Recorded cash balance')
  expect(screen.getByText('Awaiting bank receipt')).toBeTruthy()
  expect(screen.getByText('A clearer picture starts with one PDF')).toBeTruthy()
  expect(post).not.toHaveBeenCalled()
})
it('does not confirm until the user accepts the explicit payable confirmation', async () => {
  const user = userEvent.setup()
  mount(<ReviewEditor statement={structuredClone(statement)} onRefresh={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Confirm settlement' }))
  expect(screen.getByText(/No money is added to your bank/)).toBeTruthy()
  expect(post).not.toHaveBeenCalled()
})
it('blocks confirmation after changes and resets source verification', async () => {
  const user = userEvent.setup()
  mount(<ReviewEditor statement={structuredClone(statement)} onRefresh={vi.fn()} />)
  await user.type(screen.getByLabelText('CPR / settlement reference'), '-CORRECTED')
  expect(screen.getByRole('button', { name: 'Confirm settlement' }).disabled).toBe(true)
  expect(screen.getByLabelText(/I checked all source pages/).checked).toBe(false)
})
it('shows reconciliation errors and does not enable confirmation', async () => {
  const copy = structuredClone(statement)
  copy.validation = {
    ...copy.validation,
    valid: false,
    errors: ['Row 1.1: calculated net does not match.'],
  }
  mount(<ReviewEditor statement={copy} onRefresh={vi.fn()} />)
  expect(screen.getByRole('alert').textContent).toContain('calculated net does not match')
  expect(screen.getByRole('button', { name: 'Confirm settlement' }).disabled).toBe(true)
})
it('saves a review revision and uses the new revision for confirmation', async () => {
  const user = userEvent.setup(),
    refresh = vi.fn()
  post
    .mockResolvedValueOnce({ revision: 2, validation: statement.validation })
    .mockResolvedValueOnce({})
  mount(<ReviewEditor statement={structuredClone(statement)} onRefresh={refresh} />)
  await user.click(screen.getByRole('button', { name: 'Save & check' }))
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      'settlement-imports/test-statement/save-review/',
      expect.objectContaining({ revision: 1 }),
    ),
  )
  await user.click(screen.getByRole('button', { name: 'Confirm settlement' }))
  await user.click(screen.getByRole('button', { name: 'Confirm payable & selected cost updates' }))
  await waitFor(() =>
    expect(post).toHaveBeenLastCalledWith('settlement-imports/test-statement/confirm/', {
      revision: 2,
    }),
  )
  expect(refresh).toHaveBeenCalled()
})
it('can manually add a table for an unfamiliar or scanned layout', async () => {
  const user = userEvent.setup(),
    copy = structuredClone(statement)
  copy.review.tables = []
  mount(<ReviewEditor statement={copy} onRefresh={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Add a table manually' }))
  expect(screen.getByLabelText('Table 1 row 1 Tracking number')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Confirm settlement' }).disabled).toBe(true)
})
it('retains the draft and displays a stale-revision save error', async () => {
  const user = userEvent.setup()
  post.mockRejectedValue(new Error('This import changed in another tab. Reload before continuing.'))
  mount(<ReviewEditor statement={structuredClone(statement)} onRefresh={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Save & check' }))
  expect(await screen.findByText(/This import changed in another tab/)).toBeTruthy()
  expect(screen.getByLabelText('CPR / settlement reference').value).toBe('CPR-1')
})
it('requires a bank account for recording a cash movement', () => {
  mount(<CashModal accounts={[]} onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(screen.getByText('Add a bank account first.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Confirm verified bank movement' }).disabled).toBe(true)
})
it('records an expense as a bank debit without creating another expense', async () => {
  const user = userEvent.setup()
  post.mockResolvedValue({})
  mount(
    <CashModal
      expense={{ id: 'rent-1', name: 'Office rent', bank_remaining: '500.00' }}
      accounts={[{ id: 'bank-a', name: 'Business bank' }]}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />,
  )
  expect(screen.getByRole('combobox', { name: 'Direction' }).disabled).toBe(true)
  await user.click(screen.getByRole('combobox', { name: 'Account' }))
  await user.click(screen.getByRole('option', { name: 'Business bank' }))
  await user.type(screen.getByLabelText('Unique bank transaction reference'), 'RENT-123')
  await user.click(screen.getByRole('button', { name: 'Confirm verified bank movement' }))
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      'bank-entries/',
      expect.objectContaining({
        expense: 'rent-1',
        statement: null,
        amount: '-500.00',
        account: 'bank-a',
      }),
    ),
  )
  expect(post).toHaveBeenCalledTimes(1)
})
it('shows a simple review guide and keeps technical editing collapsed for recognised columns', () => {
  mount(<ReviewEditor statement={structuredClone(statement)} onRefresh={vi.fn()} />)
  expect(screen.getByRole('navigation', { name: 'Review steps' })).toBeTruthy()
  expect(screen.getByText('Shipment amounts read from your PDF — not yet approved')).toBeTruthy()
  expect(screen.getByText('Edit shipment details & column meanings').closest('details').open).toBe(
    false,
  )
  expect(
    screen.getByText('Add or review extra charges & total checks').closest('details').open,
  ).toBe(false)
})
it('opens editing tools when a heading needs help without approving anything automatically', () => {
  const copy = structuredClone(statement)
  copy.review.tables[0].columns[2].role = 'unknown'
  copy.validation.valid = false
  mount(<ReviewEditor statement={copy} onRefresh={vi.fn()} />)
  expect(screen.getByText('Edit shipment details & column meanings').closest('details').open).toBe(
    true,
  )
  expect(screen.getByText(/We need your help with 1 column headings/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Confirm settlement' }).disabled).toBe(true)
  expect(post).not.toHaveBeenCalled()
})
it('does not let a confirmed statement be edited', () => {
  const copy = {
    ...structuredClone(statement),
    status: 'CONFIRMED',
    net_amount: '900.00',
    received_amount: '0.00',
    remaining_amount: '900.00',
  }
  mount(<ReviewEditor statement={copy} onRefresh={vi.fn()} />)
  expect(screen.queryByRole('button', { name: 'Save & check' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Record bank movement' })).toBeTruthy()
  expect(screen.getByLabelText('CPR / settlement reference').closest('fieldset').disabled).toBe(
    true,
  )
})

it('requires an explicit choice between banks and posts the CPR receipt only to the selected bank', async () => {
  const user = userEvent.setup()
  post.mockResolvedValue({})
  mount(
    <CashModal
      statement={{ id: 'cpr-1', reference: 'CPR-1', remaining_amount: '900.00' }}
      accounts={[
        { id: 'bank-a', name: 'HBL', last_four: '1111' },
        { id: 'bank-b', name: 'Meezan', last_four: '2222' },
      ]}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />,
  )
  const submit = screen.getByRole('button', { name: 'Confirm verified bank movement' })
  expect(submit.disabled).toBe(true)
  expect(screen.getByText(/You have multiple accounts/)).toBeTruthy()
  fireEvent.submit(submit.closest('form'))
  expect(post).not.toHaveBeenCalled()
  await user.click(screen.getByRole('combobox', { name: 'Account' }))
  await user.click(screen.getByRole('option', { name: 'Meezan · ending 2222' }))
  expect(submit.disabled).toBe(false)
  expect(screen.getByText(/recorded only in Meezan/)).toBeTruthy()
  await user.type(screen.getByLabelText('Unique bank transaction reference'), 'TX-123')
  await user.click(submit)
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      'bank-entries/',
      expect.objectContaining({
        account: 'bank-b',
        statement: 'cpr-1',
        amount: '900.00',
        reference: 'TX-123',
      }),
    ),
  )
})
