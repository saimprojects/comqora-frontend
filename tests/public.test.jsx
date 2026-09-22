import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../src/components/Theme'
import Home from '../src/features/public/Home'
import PublicLayout from '../src/features/public/PublicLayout'
import Blog, { BlogArticle } from '../src/features/public/Blog'
import Contact from '../src/features/public/Contact'
import Legal from '../src/features/public/Legal'
import App from '../src/App'
import { api, post } from '../src/lib/api'

vi.mock('../src/lib/api', () => ({ api: vi.fn(), post: vi.fn(), all: vi.fn(), patch: vi.fn() }))
vi.mock('../src/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

beforeEach(() => {
  window.scrollTo = vi.fn()
  api.mockReset()
  post.mockReset()
  localStorage.clear()
})
afterEach(cleanup)
function mount(ui, path = '/') {
  return render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

it('renders the public homepage without login or private workspace shell', async () => {
  mount(<App />)
  expect(await screen.findByRole('heading', { name: /Less busywork/ })).toBeTruthy()
  expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy()
  expect(screen.queryByLabelText('Open navigation')).toBeNull()
  expect(screen.getByRole('link', { name: /Build your next chapter/ }).getAttribute('href')).toBe(
    '/register',
  )
  expect(screen.getByText('Illustrative data')).toBeTruthy()
})

it('redirects an anonymous dashboard visitor to login without public footer', async () => {
  mount(<App />, '/dashboard')
  expect(await screen.findByRole('heading', { name: 'Good to see you again.' })).toBeTruthy()
  expect(screen.queryByRole('navigation', { name: 'Main navigation' })).toBeNull()
})

it('supports mobile navigation and dark/light toggle', async () => {
  const user = userEvent.setup()
  mount(
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
      </Route>
    </Routes>,
  )
  const menu = screen.getByRole('button', { name: 'Open menu' })
  await user.click(menu)
  expect(menu.getAttribute('aria-expanded')).toBe('true')
  await user.keyboard('{Escape}')
  expect(menu.getAttribute('aria-expanded')).toBe('false')
  await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
})

it('shows blog posts with navigable article links', async () => {
  api.mockResolvedValue({
    results: [
      {
        title: 'A clearer margin',
        slug: 'clear-margin',
        category: 'Operations',
        excerpt: 'Practical ideas',
      },
    ],
    next: null,
  })
  mount(<Blog />, '/blog')
  expect((await screen.findByRole('link', { name: /A clearer margin/ })).getAttribute('href')).toBe(
    '/blog/clear-margin',
  )
})

it('renders editorial text safely without executing HTML', async () => {
  api.mockResolvedValue({
    title: 'Safe text',
    slug: 'safe',
    excerpt: 'Excerpt',
    category: 'Operations',
    body: '## Heading\n\n<script>unsafe()</script>',
    published_at: '2026-09-15T00:00:00Z',
    author: 'Comqora',
  })
  const view = mount(
    <Routes>
      <Route path="blog/:slug" element={<BlogArticle />} />
    </Routes>,
    '/blog/safe',
  )
  expect(await screen.findByText('<script>unsafe()</script>')).toBeTruthy()
  expect(view.container.querySelector('script')).toBeNull()
})

it('searches across all published articles through the API', async () => {
  const user = userEvent.setup()
  api.mockResolvedValue({ results: [], next: null })
  mount(<Blog />, '/blog')
  await user.type(screen.getByRole('textbox', { name: 'Search all articles' }), 'delivery costs')
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith('public/blog/?page=1&page_size=12&search=delivery%20costs'),
  )
})

it('does not claim success when the enquiry cannot be saved', async () => {
  const user = userEvent.setup()
  post.mockRejectedValue(new Error('Please try again later.'))
  mount(<Contact />, '/contact')
  await user.type(screen.getByLabelText('Your name'), 'Demo Seller')
  await user.type(screen.getByLabelText('Work email'), 'demo@example.test')
  await user.type(
    screen.getByLabelText('What would you like to discuss?'),
    'Please share a walkthrough',
  )
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.queryByText('You’re on our radar.')).toBeNull()
})

it('saves a contact enquiry with explicit privacy acknowledgement', async () => {
  const user = userEvent.setup()
  post.mockResolvedValue({ detail: 'Received' })
  mount(<Contact />, '/contact')
  await user.type(screen.getByLabelText('Your name'), 'Demo Seller')
  await user.type(screen.getByLabelText('Work email'), 'demo@example.test')
  await user.type(
    screen.getByLabelText('What would you like to discuss?'),
    'Please share a walkthrough',
  )
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      'public/enquiries/',
      expect.objectContaining({ privacy_acknowledged: true, email: 'demo@example.test' }),
    ),
  )
  expect(await screen.findByText('You’re on our radar.')).toBeTruthy()
})

it('labels unreviewed legal copy clearly', async () => {
  api.mockResolvedValue({
    business_name: 'Comqora',
    business_address: 'Kasur, Punjab, Pakistan',
    support_email: 'support@mostmailer.com',
    legal_reviewed: false,
  })
  mount(<Legal page="privacy" />, '/privacy')
  expect(screen.getByText('Draft for operator review')).toBeTruthy()
  expect(await screen.findByText(/Kasur, Punjab/)).toBeTruthy()
})
