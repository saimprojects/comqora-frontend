import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Billing from '../src/features/billing/Billing'
import { api, post } from '../src/lib/api'

const auth = vi.hoisted(() => ({ user: null, refresh: vi.fn(), signOut: vi.fn() }))
vi.mock('../src/features/auth/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../src/lib/api', () => ({ api: vi.fn(), post: vi.fn(), privateBlob: vi.fn() }))
const plans = [
  { id: 1, name: 'Ultra', monthly_price: '2425.00', ai_enabled: false },
  { id: 2, name: 'Ultra AI', monthly_price: '4599.00', ai_enabled: true },
]
let checkout
beforeEach(() => {
  vi.clearAllMocks()
  auth.user = { role: 'owner', has_dashboard_access: false }
  checkout = {
    banks: [{ id: 1, bank_name: 'Test Bank', account_title: 'Comqora' }],
    payments: [],
    subscription: null,
  }
  api.mockImplementation(async (path) => (path === 'billing/plans/' ? plans : checkout))
})
afterEach(cleanup)
function mount() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <Billing />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('shows both public prices without exposing bank or payment history', async () => {
  auth.user = null
  mount()
  expect(await screen.findByText('Rs 2,425')).toBeTruthy()
  expect(screen.getByText('Rs 4,599')).toBeTruthy()
  expect(screen.getAllByRole('link', { name: 'Get started' })).toHaveLength(2)
  expect(api).not.toHaveBeenCalledWith('billing/checkout/')
})

it('creates a checkout and submits proof without granting access', async () => {
  const user = userEvent.setup()
  const payment = {
    id: 'p1',
    plan_name: 'Ultra',
    amount: '2425.00',
    status: 'AWAITING_PROOF',
    bank_details: { bank_name: 'Test Bank', account_title: 'Comqora', account_number: '123456' },
    created_at: '2026-09-20T08:00:00Z',
  }
  post.mockImplementation(async () => {
    checkout = { ...checkout, payments: [payment] }
    return payment
  })
  mount()
  await user.click(await screen.findByRole('button', { name: 'Choose Ultra', exact: true }))
  await user.selectOptions(screen.getByLabelText('Payment account'), '1')
  await user.click(screen.getByRole('button', { name: 'Continue to checkout' }))
  expect(await screen.findByText('123456')).toBeTruthy()
  expect(post).toHaveBeenCalledWith('billing/checkout/', { plan: '1', bank: '1' })
  await user.type(screen.getByLabelText('Transaction reference'), 'TX-123')
  await user.upload(
    screen.getByLabelText('Payment screenshot'),
    new File(['test'], 'receipt.png', { type: 'image/png' }),
  )
  api.mockImplementation(async (path) => {
    if (path.endsWith('/submit/')) {
      const submitted = { ...payment, status: 'PENDING', submitted_at: payment.created_at }
      checkout = { ...checkout, payments: [submitted] }
      return submitted
    }
    return path === 'billing/plans/' ? plans : checkout
  })
  expect(screen.getByLabelText('Payment screenshot').files).toHaveLength(1)
  // jsdom native file validity does not recognize user-event's file-list shim.
  fireEvent.submit(
    screen.getByRole('button', { name: 'Submit proof for verification' }).closest('form'),
  )
  await waitFor(() => expect(screen.getByText('AWAITING ADMIN VERIFICATION')).toBeTruthy())
  const call = api.mock.calls.find(([path]) => path.endsWith('/submit/'))
  expect(call[1].body.get('reference')).toBe('TX-123')
  expect(call[1].body.get('proof').name).toBe('receipt.png')
  expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
})

it('explains missing payment setup and restricts team billing', async () => {
  auth.user = { role: 'staff' }
  mount()
  expect(await screen.findByText(/Ask your workspace owner/)).toBeTruthy()
  expect(api).not.toHaveBeenCalledWith('billing/checkout/')
  expect(screen.queryByRole('button', { name: 'Continue to checkout' })).toBeNull()
})
