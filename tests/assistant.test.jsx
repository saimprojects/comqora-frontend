import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Manager from '../src/features/assistant/Manager'
import MessageText from '../src/features/assistant/MessageText'
import Layout from '../src/components/Layout'
import { ThemeProvider } from '../src/components/Theme'
import { api, post, patch } from '../src/lib/api'
import { managerConfig, managerFixture } from './assistant-fixture'

vi.mock('../src/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { workspace_name: 'Studio Commerce', role: 'viewer' } }),
}))
vi.mock('../src/lib/api', () => ({ api: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
let fixture
beforeEach(() => {
  fixture = managerFixture()
  api.mockReset().mockImplementation(fixture.api)
  post.mockReset().mockImplementation(fixture.post)
  patch.mockReset().mockImplementation(fixture.patch)
})
afterEach(cleanup)
function mount(withLayout = false) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/manager']}>
        {withLayout ? (
          <ThemeProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="manager" element={<Manager />} />
                <Route path="dashboard" element={<h1>Dashboard fixture</h1>} />
              </Route>
            </Routes>
          </ThemeProvider>
        ) : (
          <Manager />
        )}
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
async function send(question = 'Show the business picture') {
  fireEvent.change(await screen.findByLabelText('Ask your Manager'), {
    target: { value: question },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
}
it('uses the brand, discloses broad reads, and does not send anything on opening', async () => {
  mount()
  await screen.findByRole('heading', { name: "Studio Commerce's Manager" })
  expect(screen.queryByRole('combobox', { name: 'AI model' })).toBeNull()
  expect(
    screen.getAllByText(/Your Manager can read all workspace business data/).length,
  ).toBeGreaterThan(0)
  expect(screen.getByText(/Relevant records are sent to Fazita/)).toBeTruthy()
  expect(post).not.toHaveBeenCalled()
})
it('disables sending until an administrator configures the provider', async () => {
  api.mockImplementation((path) =>
    path === 'assistant/config/'
      ? Promise.resolve({ ...managerConfig, ready: false, models: [] })
      : fixture.api(path),
  )
  mount()
  await screen.findByText('Temporarily unavailable')
  expect(screen.queryByText('Connect your intelligence.')).toBeNull()
  expect(screen.queryByText(/Jazzmin|Platform admin|AI provider connections/)).toBeNull()
  expect(screen.getByLabelText('Ask your Manager').disabled).toBe(true)
  expect(screen.getByRole('button', { name: 'Send message' }).disabled).toBe(true)
})
it('creates a conversation, shows evidence, and requires explicit confirmation', async () => {
  mount()
  await send()
  await screen.findByText('Recorded cash: PKR 186,420.00')
  expect(post.mock.calls.find(([url]) => url.endsWith('/send/'))[1]).not.toHaveProperty('model_id')
  expect(screen.getByText('Records consulted (2)')).toBeTruthy()
  expect(post.mock.calls.filter(([url]) => url.startsWith('assistant/actions/'))).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: 'Confirm & apply' }))
  await screen.findByText('Applied successfully.', { exact: false })
  expect(post.mock.calls.at(-1)[1]).toEqual({ decision: 'confirm' })
})
it('reuses the same request key after an interrupted response', async () => {
  let fail = true
  post.mockImplementation((url, body) => {
    if (url.endsWith('/send/') && fail) {
      fail = false
      return Promise.reject(new Error('Connection interrupted'))
    }
    return fixture.post(url, body)
  })
  mount()
  await send()
  await screen.findByRole('alert')
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Send message' }).disabled).toBe(false),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
  await screen.findByText('Recorded cash: PKR 186,420.00')
  const sends = post.mock.calls.filter(([url]) => url.endsWith('/send/'))
  expect(sends).toHaveLength(2)
  expect(sends[0][1].request_key).toBe(sends[1][1].request_key)
})
it('renders provider HTML as text and rejects external source links', async () => {
  post.mockImplementation(async (url, body) => {
    const result = await fixture.post(url, body)
    if (url.endsWith('/send/')) {
      result.answer = '<img src="https://evil.invalid/leak" onerror="alert(1)">'
      result.sources.push({ label: 'Unsafe source', url: 'https://evil.invalid/' })
    }
    return result
  })
  const view = mount()
  await send('Find an order')
  await screen.findByText(/<img src=/)
  expect(view.container.querySelector('img')).toBeNull()
  expect(screen.queryByRole('link', { name: 'Unsafe source' })).toBeNull()
})

it('renders real tables with aligned numeric cells and strong emphasis', () => {
  render(
    <MessageText
      text={
        '| Metric | Amount |\n| :--- | ---: |\n| **Realized profit** | **PKR 712.90** |\n| Net profit | −PKR 55,187.10 |'
      }
    />,
  )
  expect(screen.getByRole('table')).toBeTruthy()
  expect(screen.getAllByRole('columnheader')).toHaveLength(2)
  expect(screen.getAllByRole('row')).toHaveLength(3)
  expect(screen.getByRole('cell', { name: 'PKR 712.90' }).style.textAlign).toBe('right')
  expect(screen.getByText('Realized profit').tagName).toBe('STRONG')
  expect(screen.getByRole('region', { name: 'Response table' }).tabIndex).toBe(0)
})

it('keeps escaped pipes and code intact without loading markdown images or links', () => {
  const view = render(
    <MessageText
      text={
        '| Name | Value |\n| --- | --- |\n| A\\|B | `x` |\n\n[External](https://evil.invalid) ![leak](https://evil.invalid/image)\n\n```text\n| Not | a table |\n```'
      }
    />,
  )
  expect(screen.getByRole('cell', { name: 'A|B' })).toBeTruthy()
  expect(screen.getAllByRole('table')).toHaveLength(1)
  expect(view.container.querySelector('pre code').textContent).toContain('| Not | a table |')
  expect(view.container.querySelector('a, img, iframe, script')).toBeNull()
})

it('opens in a dedicated chat layout and returns to the normal workspace', async () => {
  const view = mount(true)
  await screen.findByRole('heading', { name: "Studio Commerce's Manager" })
  expect(view.container.querySelector('.manager-workspace')).toBeTruthy()
  expect(view.container.querySelector('.topbar, .sidebar, .app-footer')).toBeNull()
  expect(screen.queryByText('Ask a question. Find the record. Know your next move.')).toBeNull()
  fireEvent.click(screen.getByRole('link', { name: 'Back to workspace' }))
  await screen.findByRole('heading', { name: 'Dashboard fixture' })
  expect(view.container.querySelector('.topbar')).toBeTruthy()
})

it('closes the mobile conversation drawer with Escape', async () => {
  const view = mount()
  const toggle = await screen.findByRole('button', { name: 'Show conversations' })
  fireEvent.click(toggle)
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  expect(view.container.querySelector('.manager-history-open')).toBeTruthy()
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(document.activeElement).toBe(toggle)
})

it('shows queued background research and lets its author stop it', async () => {
  let turn
  post.mockImplementation(async (url, body) => {
    if (url.endsWith('/cancel/')) {
      turn.status = 'CANCELLED'
      return { status: 'CANCELLED' }
    }
    const result = await fixture.post(url, body)
    if (url.endsWith('/send/')) {
      turn = result
      turn.status = 'QUEUED'
      turn.answer = ''
      turn.actions = []
    }
    return result
  })
  mount()
  await send()
  await screen.findByText('Queued for research…')
  expect(screen.getByRole('button', { name: 'Send message' }).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Stop research' }))
  await screen.findByText(/Research stopped\./)
  expect(screen.getByLabelText('Ask your Manager').disabled).toBe(false)
})
