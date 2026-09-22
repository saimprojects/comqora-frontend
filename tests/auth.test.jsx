import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthPage from '../src/features/auth/AuthPage'
import { post } from '../src/lib/api'

vi.mock('../src/features/auth/AuthContext', () => ({ useAuth: () => ({ refresh: vi.fn() }) }))
vi.mock('../src/lib/api', () => ({ post: vi.fn() }))
vi.mock('../src/components/Layout', () => ({ Logo: () => <span>Comqora</span> }))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it.each([true, false])(
  'shows the saved account and verification next step when email delivery is %s',
  async (sent) => {
    post.mockResolvedValue({ verification_required: true, verification_email_sent: sent })
    render(
      <MemoryRouter initialEntries={['/register']}>
        <AuthPage />
      </MemoryRouter>,
    )
    fireEvent.submit(screen.getByRole('button', { name: 'Create your workspace' }).closest('form'))
    expect(await screen.findByText('Your account was created')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Request a new verification email' }).getAttribute('href'),
    ).toBe('/resend-verification')
    expect(screen.queryByRole('button', { name: 'Create your workspace' })).toBeNull()
    expect(
      screen.getByText(sent ? /Check your inbox and spam folder/ : /Your account is saved, but/),
    ).toBeTruthy()
  },
)
