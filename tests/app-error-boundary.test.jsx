import { Suspense, lazy } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import AppErrorBoundary from '../src/components/AppErrorBoundary'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('offers recovery when a deployed route chunk is no longer available', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const Page = lazy(() =>
    Promise.reject(new TypeError('Failed to fetch dynamically imported module')),
  )
  render(
    <AppErrorBoundary>
      <Suspense fallback="Loading">
        <Page />
      </Suspense>
    </AppErrorBoundary>,
  )
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy()
})

it('renders working routes normally', () => {
  render(
    <AppErrorBoundary>
      <p>Billing loaded</p>
    </AppErrorBoundary>,
  )
  expect(screen.getByText('Billing loaded')).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})
