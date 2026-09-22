import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  Layers3,
  Box,
  Truck,
  Megaphone,
  MessageCircle,
  ChartNoAxesCombined,
  Wallet,
  Landmark,
  Settings,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Bell,
  PanelLeftClose,
  X,
  ArrowUpRight,
  LogOut,
  ShieldCheck,
  Command,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { api } from '../lib/api'
import { initials, date } from '../lib/format'
import { Modal, Empty } from './ui'
import { toast } from 'sonner'
import Brand from './Brand'
import ThemeToggle from './ThemeToggle'
import SearchField from './SearchField'
const groups = [
  {
    label: 'WORKSPACE',
    links: [
      ['Overview', '/dashboard', LayoutDashboard],
      ['AI Manager', '/manager', Sparkles],
      ['Plans & billing', '/billing', Wallet],
      ['Orders', '/orders', ShoppingBag],
      ['Customers', '/customers', Users],
    ],
  },
  {
    label: 'OPERATIONS',
    links: [
      ['Products', '/products', Package],
      ['Categories', '/categories', Layers3],
      ['Inventory', '/inventory', Layers3],
      ['Packaging', '/packaging', Box],
      ['Couriers', '/couriers', Truck],
    ],
  },
  {
    label: 'PERFORMANCE',
    links: [
      ['Marketing', '/marketing', Megaphone],
      ['WhatsApp', '/whatsapp', MessageCircle],
      ['Analytics', '/analytics', ChartNoAxesCombined],
      ['Expenses', '/expenses', Wallet],
      ['Bank & settlements', '/bank', Landmark],
    ],
  },
]
export function Logo() {
  return <Brand inverse />
}
export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation(),
    navigate = useNavigate()
  const [mobile, setMobile] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [activityOpen, setActivityOpen] = useState(false)
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250)
    return () => clearTimeout(timer)
  }, [search])
  useEffect(() => {
    function key(e) {
      if (e.key === 'Escape') setMobile(false)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  const results = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: async () => {
      const q = encodeURIComponent(debounced)
      const [orders, products, customers] = await Promise.all([
        api(`orders/?search=${q}&page_size=5`),
        api(`products/?search=${q}&page_size=5`),
        api(`customers/?search=${q}&page_size=5`),
      ])
      return [
        ...orders.results.map((o) => ({
          name: o.number,
          sub: o.customer_name,
          url: `/orders/${o.id}`,
        })),
        ...products.results.map((p) => ({ name: p.name, sub: p.sku, url: '/products' })),
        ...customers.results.map((c) => ({ name: c.name, sub: c.city, url: '/customers' })),
      ]
    },
    enabled: searchOpen && debounced.length > 1,
  })
  const activity = useQuery({
    queryKey: ['activity'],
    queryFn: () => api('activity/'),
    enabled: activityOpen,
  })
  const current =
    [
      ...groups.flatMap((g) => g.links.map(([label, path]) => ({ label, path }))),
      { label: 'Settings', path: '/settings' },
    ].find((l) => l.path === location.pathname)?.label ||
    (location.pathname.startsWith('/orders/')
      ? 'Order details'
      : location.pathname.startsWith('/bank/')
        ? 'Settlement review'
        : 'Workspace')
  useEffect(() => {
    document.title = `${current} · Comqora`
  }, [current])
  // Manager owns its full-viewport chat layout, with an explicit return to the workspace.
  if (location.pathname === '/manager') {
    return (
      <main className="manager-workspace">
        <Outlet />
      </main>
    )
  }
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside id="workspace-navigation" className={`sidebar ${mobile ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand to="/dashboard" />
          <button
            className="mobile-only icon-button"
            onClick={() => setMobile(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <button
          className="workspace-switch"
          onClick={() => {
            navigate('/settings')
            setMobile(false)
          }}
        >
          <span className="workspace-avatar">{initials(user?.workspace_name || 'S')}</span>
          <span>
            <strong>{user?.workspace_name?.replace(' · Demo', '') || 'My workspace'}</strong>
            <small>
              {user?.workspace_name?.includes('Demo') ? 'Demo workspace' : 'Business workspace'}
            </small>
          </span>
          <ChevronsUpDown size={14} />
        </button>
        <nav className="nav-groups">
          {groups.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-label">{group.label}</div>
              {group.links.map(([name, path, Icon]) => (
                <NavLink
                  end={path === '/dashboard'}
                  to={path}
                  key={path}
                  onClick={() => setMobile(false)}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} strokeWidth={1.7} />
                  <span
                    className={path === '/manager' ? 'manager-nav-name' : undefined}
                    title={
                      path === '/manager'
                        ? `${user?.workspace_name || 'Your business'}'s Manager`
                        : undefined
                    }
                  >
                    {path === '/manager'
                      ? `${user?.workspace_name || 'Your business'}'s Manager`
                      : name}
                  </span>
                  {name === 'Analytics' && <span className="nav-new">NEW</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">
              <ShieldCheck size={18} />
            </span>
            <strong>Your business. In control.</strong>
            <p>
              Every order. Every cost.
              <br />A clearer picture of your profit.
            </p>
            <Link to="/analytics" onClick={() => setMobile(false)}>
              Explore your insights <ArrowUpRight size={14} />
            </Link>
          </div>
          <NavLink className="nav-link" to="/settings" onClick={() => setMobile(false)}>
            <Settings size={18} />
            Settings
          </NavLink>
          <button
            className="account-button"
            onClick={() => {
              navigate('/settings')
              setMobile(false)
            }}
          >
            <span className="avatar">{initials(user?.first_name || 'U')}</span>
            <span>
              <strong>
                {user?.first_name} {user?.last_name}
              </strong>
              <small>{user?.role} account</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button"
              aria-label="Open navigation"
              aria-controls="workspace-navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              <PanelLeftClose size={18} />
            </button>
            <span className="breadcrumb-divider" />
            <span className="muted">Workspace</span>
            <span className="muted">/</span>
            <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <Link to="/" className="icon-button" aria-label="Visit Comqora website">
              <ExternalLink size={17} />
            </Link>
            <button
              className="search-trigger"
              aria-label="Search orders, products and customers"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={18} />
              <span>Search workspace…</span>
              <kbd>{/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-button notification"
              aria-label="Recent activity"
              onClick={() => setActivityOpen(true)}
            >
              <Bell size={19} />
            </button>
            <button
              className="avatar avatar-small"
              onClick={() => navigate('/settings')}
              aria-label="Your account"
            >
              {initials(user?.first_name || 'U')}
            </button>
          </div>
        </header>
        <main className="main-content" key={location.pathname}>
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} Comqora. Commerce, at your core.</span>
          <span>
            <i className="tiny-dot" /> Workspace data · PKR
          </span>
        </footer>
      </div>
      {searchOpen && (
        <Modal
          title="Search your workspace"
          description="Find an order, product, or customer."
          onClose={() => setSearchOpen(false)}
        >
          <SearchField
            autoFocus
            label="Search workspace"
            value={search}
            onValueChange={setSearch}
            placeholder="Search by name, SKU, or order number…"
          />
          <div className="search-results">
            {results.isFetching ? (
              <p className="muted">Searching…</p>
            ) : results.isError ? (
              <p className="form-error">{results.error.message}</p>
            ) : debounced.length < 2 ? (
              <p className="muted">Type at least two characters to search.</p>
            ) : results.data?.length ? (
              results.data.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    navigate(r.url)
                    setSearchOpen(false)
                  }}
                >
                  <span>
                    <strong>{r.name}</strong>
                    <small>{r.sub}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))
            ) : (
              <Empty title="No matches" description="Try another name, SKU, or order number." />
            )}
          </div>
        </Modal>
      )}
      {activityOpen && (
        <Modal
          title="Workspace activity"
          description="A traceable history of changes in your business."
          onClose={() => setActivityOpen(false)}
        >
          {activity.isError ? (
            <p className="form-error">{activity.error.message}</p>
          ) : activity.data?.length ? (
            <div className="activity-list">
              {activity.data.map((a) => (
                <div key={a.id}>
                  <span className="activity-icon">
                    <Command size={16} />
                  </span>
                  <div>
                    <strong>{a.action.replaceAll('.', ' · ').replaceAll('_', ' ')}</strong>
                    <p>
                      {a.actor} · {date(a.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No activity yet"
              description="Actions in your workspace will appear here."
            />
          )}
          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={() => signOut().catch((e) => toast.error(e.message))}
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
