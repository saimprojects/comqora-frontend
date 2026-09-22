import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import Brand from '../../components/Brand'
import ThemeToggle from '../../components/ThemeToggle'
import { useAuth } from '../auth/AuthContext'
import './public.css'

export function PageMeta({ title, description }) {
  const location = useLocation()
  useEffect(() => {
    document.title = `${title} · Comqora`
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        description ||
          'Comqora brings orders, inventory, courier tracking and profit into one connected workspace.',
      )
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = `https://comqora.com${location.pathname}`
    return () => canonical.remove()
  }, [title, description, location.pathname])
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
