import { afterEach, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PageMeta } from '../src/features/public/PublicLayout'

afterEach(cleanup)

it('sets article metadata, normalizes canonicals and removes stale schema on navigation', () => {
  const post = {
    title: 'Orders & margins',
    excerpt: 'Know your costs.',
    author: 'Comqora editorial',
    published_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-02T10:00:00Z',
    category: 'Operations',
  }
  const view = render(
    <MemoryRouter initialEntries={['/blog/orders/?campaign=test']}>
      <PageMeta title={post.title} description={post.excerpt} article={post} />
    </MemoryRouter>,
  )
  expect(document.title).toBe('Orders & margins · Comqora')
  expect(document.querySelector('link[rel="canonical"]').href).toBe(
    'https://comqora.com/blog/orders',
  )
  expect(document.querySelector('meta[property="og:type"]').content).toBe('article')
  const schema = JSON.parse(
    document.querySelector('script[type="application/ld+json"]').textContent,
  )
  expect(schema.headline).toBe(post.title)
  expect(schema.dateModified).toBe(post.updated_at)
  view.rerender(
    <MemoryRouter>
      <PageMeta title="Article unavailable" noindex />
    </MemoryRouter>,
  )
  expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, follow')
  expect(document.querySelector('script[type="application/ld+json"]')).toBeNull()
  expect(document.querySelector('meta[property="article:published_time"]')).toBeNull()
  view.unmount()
  expect(document.querySelector('link[rel="canonical"]')).toBeNull()
  expect(document.querySelector('meta[property="og:title"]')).toBeNull()
})
