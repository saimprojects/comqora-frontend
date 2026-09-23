import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import Brand from '../../components/Brand'
import ThemeToggle from '../../components/ThemeToggle'
import { useAuth } from '../auth/AuthContext'
import './public.css'

export function PageMeta({ title, description, article, noindex = false }) {
  const location = useLocation()
  const articleJson = article ? JSON.stringify(article) : null
  useEffect(() => {
    const previousTitle = document.title
    const undo = []
    const setMeta = (attribute, key, content) => {
      let node = document.head.querySelector(`meta[${attribute}="${key}"]`)
      const existed = Boolean(node)
      const previous = node?.getAttribute('content')
      if (!node) {
        node = document.createElement('meta')
        node.setAttribute(attribute, key)
        document.head.appendChild(node)
      }
      node.setAttribute('content', content)
      undo.push(() => {
        if (existed) node.setAttribute('content', previous || '')
        else node.remove()
      })
    }
    const summary =
      description ||
      'Comqora brings orders, inventory, courier tracking and profit into one connected workspace.'
    const path = location.pathname.replace(/\/+$/, '') || '/'
    const url = `https://comqora.com${path}`
    document.title = `${title} · Comqora`
    setMeta('name', 'description', summary)
    setMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow')
    setMeta('property', 'og:title', document.title)
    setMeta('property', 'og:description', summary)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:site_name', 'Comqora')
    setMeta('property', 'og:type', articleJson ? 'article' : 'website')
    setMeta('name', 'twitter:card', 'summary')
    setMeta('name', 'twitter:title', document.title)
    setMeta('name', 'twitter:description', summary)
    const canonical = document.createElement('link')
    canonical.rel = 'canonical'
    canonical.href = url
    document.head.appendChild(canonical)
    let structured
    if (articleJson) {
      const post = JSON.parse(articleJson)
      setMeta('property', 'article:published_time', post.published_at)
      setMeta('property', 'article:modified_time', post.updated_at)
      structured = document.createElement('script')
      structured.type = 'application/ld+json'
      structured.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        datePublished: post.published_at,
        dateModified: post.updated_at,
        author: { '@type': 'Person', name: post.author },
        publisher: { '@type': 'Organization', name: 'Comqora', url: 'https://comqora.com/' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        articleSection: post.category,
      })
      document.head.appendChild(structured)
    }
    return () => {
      document.title = previousTitle
      canonical.remove()
      structured?.remove()
      undo.forEach((restore) => restore())
    }
  }, [title, description, location.pathname, articleJson, noindex])
  return null
}

export default function PublicLayout() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [location.pathname, location.hash])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="public-site">
      <a className="skip-link" href="#public-content">
        Skip to content
      </a>
      <header className="public-header">
        <div className="public-nav">
          <Brand />
          <nav
            id="public-navigation"
            className={open ? 'public-links is-open' : 'public-links'}
            aria-label="Main navigation"
            onClick={() => setOpen(false)}
          >
            <Link to="/#platform">Platform</Link>
            <Link to="/#how-it-works">How it works</Link>
            <NavLink to="/pricing">Pricing</NavLink>
            <NavLink to="/blog">Journal</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <Link className="mobile-signin" to={user ? '/dashboard' : '/login'}>
              {user ? 'Dashboard' : 'Sign in'}
            </Link>
          </nav>
          <div className="public-nav-actions">
            <ThemeToggle />
            <Link className="public-signin" to={user ? '/dashboard' : '/login'}>
              {user ? 'Dashboard' : 'Sign in'}
            </Link>
            <Link className="btn btn-primary" to={user ? '/dashboard' : '/register'}>
              {user ? 'Open workspace' : 'Get started'}
              <ArrowUpRight size={15} />
            </Link>
            <button
              className="icon-button public-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="public-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="public-content">
        <Outlet />
      </main>
      <footer className="public-footer">
        <div className="footer-main">
          <div>
            <Brand />
            <p>
              The connected core of your commerce.
              <br />
              Built for the work behind every order.
            </p>
            <p>
              <a href="mailto:support@mostmailer.com">support@mostmailer.com</a>
              <br />
              Kasur, Punjab, Pakistan
            </p>
          </div>
          <div>
            <h2>Explore</h2>
            <Link to="/#platform">The platform</Link>
            <Link to="/blog">Comqora journal</Link>
            <Link to="/contact">Talk to us</Link>
          </div>
          <div>
            <h2>Your workspace</h2>
            <Link to="/register">Create an account</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/security">Security & data</Link>
          </div>
          <div>
            <h2>Legal</h2>
            <Link to="/privacy">Privacy notice</Link>
            <Link to="/terms">Terms of service</Link>
            <Link to="/cookies">Cookie policy</Link>
            <Link to="/acceptable-use">Acceptable use</Link>
            <Link to="/refunds">Billing & refunds</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Comqora. Commerce, at your core.</span>
          <span>Designed for clarity. Built for your next chapter.</span>
        </div>
      </footer>
    </div>
  )
}
