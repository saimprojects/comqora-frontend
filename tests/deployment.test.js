// @vitest-environment node
import { readFileSync } from 'node:fs'
import { convertRewrites, getTransformedRoutes } from '@vercel/routing-utils'
import { expect, it } from 'vitest'

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))

it('preserves Django trailing slashes when Vercel compiles external rewrites', () => {
  const routes = convertRewrites(config.rewrites)
  const origin = new URL(config.rewrites[0].destination).origin
  expect(origin).toMatch(/^https:\/\/[a-z0-9-]+\.up\.railway\.app$/)
  for (const path of [
    '/api/auth/login/',
    '/api/billing/checkout/',
    '/api/billing/payments/123/submit/',
    '/admin/login/',
    '/static/vendor/jazzmin.css',
  ]) {
    const route = routes.find((rule) => new RegExp(rule.src).test(path))
    expect(route).toBeDefined()
    expect(path.replace(new RegExp(route.src), route.dest)).toBe(origin + path)
  }
  expect(config.trailingSlash).toBeUndefined()
  const fallback = new RegExp(routes.at(-1).src)
  for (const path of ['/orders', '/orders/123', '/pricing', '/billing'])
    expect(fallback.test(path)).toBe(true)
  for (const path of [
    '/api/auth/login/',
    '/api',
    '/admin/',
    '/static/admin.css',
    '/assets/main.js',
  ])
    expect(fallback.test(path)).toBe(false)
})

it('compiles valid routes and disables private CDN caching', () => {
  const result = getTransformedRoutes(config)
  expect(result.error).toBeNull()
  for (const prefix of ['api', 'admin']) {
    const headers = config.headers.find((rule) => rule.source === `/${prefix}/:path(.*)`).headers
    expect(headers).toContainEqual({ key: 'x-vercel-enable-rewrite-caching', value: '0' })
    expect(headers).toContainEqual({ key: 'Cache-Control', value: 'private, no-store' })
  }
})

it('routes live sitemaps before the SPA and keeps the canonical www redirect', () => {
  const routes = convertRewrites(config.rewrites)
  for (const path of [
    '/sitemap.xml',
    '/sitemap-pages.xml',
    '/sitemap-blog-1.xml',
    '/sitemap-blog-20.xml',
  ]) {
    const rule = routes.find((route) => new RegExp(route.src).test(path))
    expect(path.replace(new RegExp(rule.src), rule.dest)).toBe(
      `https://comqora.up.railway.app/api/public${path}`,
    )
  }
  expect(readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')).toContain(
    'Sitemap: https://comqora.com/sitemap.xml',
  )
  expect(config.redirects[0].destination).toBe('https://comqora.com/:path*')
})
