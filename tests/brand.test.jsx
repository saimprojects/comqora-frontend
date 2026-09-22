import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Brand from '../src/components/Brand'

afterEach(cleanup)

it('uses the new transparent mark and accessible wordmark on workspace links', () => {
  render(
    <MemoryRouter>
      <Brand to="/dashboard" />
    </MemoryRouter>,
  )
  const logo = screen.getByRole('link', { name: 'Comqora home' })
  expect(logo.getAttribute('href')).toBe('/dashboard')
  expect(logo.querySelector('img').getAttribute('src')).toBe('/brand/comqora-symbol-192.png')
  expect(logo.querySelector('img').getAttribute('alt')).toBe('')
  expect(logo.querySelector('.cq-wordmark path').getAttribute('d')).toBeTruthy()
})

it('supports the inverse logo on dark authentication backgrounds', () => {
  render(
    <MemoryRouter>
      <Brand inverse />
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('link', { name: 'Comqora home' }).classList.contains('brand-inverse'),
  ).toBe(true)
})

it('ships matching RGBA favicons and transparent full-logo PNG exports', () => {
  const head = readFileSync(resolve('index.html'), 'utf8')
  expect(head).toContain('/brand/comqora-symbol-32.png')
  expect(head).toContain('/brand/comqora-symbol-64.png')
  for (const file of [
    'comqora-symbol-32.png',
    'comqora-symbol-64.png',
    'comqora-logo.png',
    'comqora-logo-dark.png',
  ]) {
    const png = readFileSync(resolve('public/brand', file))
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect(png[25]).toBe(6) // PNG RGBA; pixel-level alpha is also checked by export-brand.cjs.
  }
})
