import { useState } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../src/components/Theme'
import SearchField from '../src/components/SearchField'
import Layout from '../src/components/Layout'
import Settings from '../src/features/settings/Settings'
import ResourcePage from '../src/features/resources/ResourcePage'
import Orders from '../src/features/orders/Orders'
import NewOrder from '../src/features/orders/NewOrder'
import Home from '../src/features/public/Home'
import { api, all, post } from '../src/lib/api'
import { configs } from '../src/features/resources/config'

const auth = vi.hoisted(() => ({
  user: {
    first_name: 'Demo',
    email: 'demo@example.test',
    role: 'owner',
    workspace_name: 'Demo store',
    is_staff: true,
  },
  signOut: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('../src/features/auth/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../src/lib/api', () => ({
  api: vi.fn(),
  all: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  exportOrders: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  auth.user.role = 'owner'
  auth.signOut.mockReset().mockResolvedValue(undefined)
  api.mockReset().mockResolvedValue({ results: [], count: 0 })
  all.mockReset().mockResolvedValue([])
  post.mockReset()
  localStorage.clear()
})
afterEach(cleanup)

function mount(children) {
  return render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

it('clears search without submitting its form and returns focus to the input', async () => {
  const user = userEvent.setup(),
    submit = vi.fn()
  function Example() {
    const [value, setValue] = useState('TCS')
    return (
      <form onSubmit={submit}>
        <SearchField label="Search couriers" value={value} onValueChange={setValue} />
      </form>
    )
  }
  mount(<Example />)
  await user.click(screen.getByRole('button', { name: 'Clear search couriers' }))
  const input = screen.getByRole('searchbox', { name: 'Search couriers' })
  expect(input.value).toBe('')
  expect(document.activeElement).toBe(input)
  expect(submit).not.toHaveBeenCalled()
})

it.each([
  'customers',
  'products',
  'categories',
  'inventory',
  'packaging',
  'couriers',
  'marketing',
  'expenses',
])('preserves %s server search and clears it', async (resource) => {
  const user = userEvent.setup()
  mount(<ResourcePage resource={resource} />)
  const input = screen.getByRole('searchbox', { name: `Search ${resource}` })
  await user.type(input, 'sample')
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      `${configs[resource].endpoint}/?page=1&page_size=12&search=sample`,
    ),
  )
  api.mockClear()
  await user.click(screen.getByRole('button', { name: `Clear search ${resource}` }))
  expect(input.value).toBe('')
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(`${configs[resource].endpoint}/?page=1&page_size=12&search=`),
  )
})

it('keeps the selected order status when searching and clearing', async () => {
  const user = userEvent.setup()
  mount(<Orders />)
  await user.click(screen.getByRole('button', { name: 'delivered', exact: true }))
  await user.type(screen.getByRole('searchbox', { name: 'Search orders' }), 'CQ1')
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith('orders/?page=1&search=CQ1&status=DELIVERED'),
  )
  api.mockClear()
  await user.click(screen.getByRole('button', { name: 'Clear search orders' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('orders/?page=1&search=&status=DELIVERED'))
})

it('removes the activity Admin link but retains the main WhatsApp navigation', async () => {
  const user = userEvent.setup()
  api.mockResolvedValue([])
  mount(<Layout />)
  expect(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toBe('/whatsapp')
  await user.click(screen.getByRole('button', { name: 'Recent activity' }))
  const dialog = screen.getByRole('dialog', { name: 'Workspace activity' })
  expect(within(dialog).queryByRole('link', { name: /Admin/ })).toBeNull()
  expect(within(dialog).getByRole('button', { name: 'Sign out' })).toBeTruthy()
})

it('removes redundant Settings tabs and requires explicit sign-out confirmation', async () => {
  const user = userEvent.setup()
  mount(<Settings />)
  const nav = screen.getByRole('navigation', { name: 'Account settings' })
  expect(within(nav).queryByRole('button', { name: 'WhatsApp' })).toBeNull()
  expect(within(nav).queryByRole('button', { name: 'Integrations' })).toBeNull()
  await user.click(within(nav).getByRole('button', { name: 'Sign out & safety' }))
  expect(auth.signOut).not.toHaveBeenCalled()
  expect(screen.getByRole('heading', { name: 'Danger zone' })).toBeTruthy()
  expect(screen.getByText('demo@example.test')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Sign out', exact: true }))
  expect(auth.signOut).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Stay signed in' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Sign out', exact: true }))
  await user.click(screen.getByRole('button', { name: 'Confirm sign out' }))
  expect(auth.signOut).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(post).not.toHaveBeenCalled()
})

it('keeps the confirmation open and explains a failed sign-out', async () => {
  auth.signOut.mockRejectedValue(new Error('Connection lost. Try again.'))
  const user = userEvent.setup()
  mount(<Settings />)
  await user.click(screen.getByRole('button', { name: 'Sign out & safety' }))
  await user.click(screen.getByRole('button', { name: 'Sign out', exact: true }))
  await user.click(screen.getByRole('button', { name: 'Confirm sign out' }))
  expect((await screen.findByRole('alert')).textContent).toBe('Connection lost. Try again.')
  expect(screen.getByRole('dialog')).toBeTruthy()
})

it('routes the security action to the real password form and gives staff safe closure guidance', async () => {
  auth.user.role = 'staff'
  const user = userEvent.setup()
  mount(<Settings />)
  await user.click(screen.getByRole('button', { name: 'Sign out & safety' }))
  expect(screen.getByText(/Contact your workspace owner/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Change password' }))
  expect(screen.getByLabelText('Current password')).toBeTruthy()
})

it('keeps the enlarged new-customer control as a non-submit toggle', async () => {
  const user = userEvent.setup()
  mount(<NewOrder onClose={vi.fn()} />)
  const toggle = await screen.findByRole('button', { name: 'New customer' })
  expect(toggle.classList.contains('new-customer-button')).toBe(true)
  expect(toggle.type).toBe('button')
  await user.click(toggle)
  expect(screen.getByLabelText('Full name')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Choose existing customer' }))
  expect(screen.getByRole('combobox', { name: 'Customer', exact: true })).toBeTruthy()
  expect(post).not.toHaveBeenCalled()
})

it('lets visitors explore sample orders, tracking and stock without backend actions', async () => {
  const user = userEvent.setup()
  mount(<Home />)
  const preview = screen.getByRole('group', { name: 'Explore the workspace preview' })
  for (const [button, heading] of [
    ['Orders', 'Ready for the next step.'],
    ['Tracking', 'Every milestone, in view.'],
    ['Stock & costs', 'More than a stock count.'],
  ]) {
    await user.click(within(preview).getByRole('button', { name: button }))
    expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
    expect(within(preview).getByRole('button', { name: button }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  }
  await user.click(within(preview).getByRole('button', { name: 'Overview' }))
  expect(screen.getByRole('heading', { name: 'A clearer kind of control.' })).toBeTruthy()
  expect(screen.getByText('Illustrative data')).toBeTruthy()
  expect(api).not.toHaveBeenCalled()
  expect(post).not.toHaveBeenCalled()
})
