import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Banknote,
  ChartNoAxesCombined,
  ShoppingBag,
  PackageCheck,
  Download,
  Plus,
  ArrowRight,
  CircleHelp,
  Sparkles,
  Truck,
  RotateCcw,
  Package,
  CircleCheck,
  Clock3,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  Loading,
  PageHeading,
  StatCard,
} from '../../components/ui'
import { compact, money, number, initials } from '../../lib/format'
import { exportOrders } from '../../lib/api'
import { RevenueChart, useAnalytics } from './shared'
import { ACTIVE_SHIPMENT_STATUSES } from '../../lib/orderStatus'
export default function Dashboard() {
  const { user } = useAuth()
  const { data: d, isPending, error, refetch, selector } = useAnalytics()
  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} retry={refetch} />
  const t = d.totals,
    s = d.statuses
  const finalCount = s.DELIVERED + s.RETURNED
  const delivery = finalCount ? ((s.DELIVERED / finalCount) * 100).toFixed(1) : '0'
  const statusItems = [
    { label: 'Delivered', value: s.DELIVERED, color: 'var(--success)', icon: CircleCheck },
    { label: 'In transit', value: s.IN_TRANSIT, color: 'var(--amber)', icon: Truck },
    {
      label: 'Out for delivery',
      value: s.OUT_FOR_DELIVERY || 0,
      color: 'var(--chart-cyan)',
      icon: Truck,
    },
    {
      label: 'Return in transit',
      value: s.RETURN_IN_TRANSIT || 0,
      color: 'var(--chart-secondary)',
      icon: RotateCcw,
    },
    { label: 'Returned', value: s.RETURNED, color: 'var(--danger)', icon: RotateCcw },
    { label: 'Created', value: s.CREATED, color: 'var(--green)', icon: Package },
    {
      label: 'Delivery failed',
      value: s.DELIVERY_FAILED,
      color: 'var(--chart-violet)',
      icon: AlertTriangle,
    },
    { label: 'Cancelled', value: s.CANCELLED, color: 'var(--muted)', icon: Clock3 },
  ]
  return (
    <>
      <PageHeading
        eyebrow="LET’S MAKE TODAY A GOOD ONE"
        title={`Welcome back, ${user?.first_name.split(' ')[0]}.`}
        description="Here’s the big picture of your business. Every detail, in one place."
        actions={
          <>
            {selector}
            <Button
              variant="secondary"
              onClick={() => exportOrders().catch((e) => toast.error(e.message))}
            >
              <Download size={16} />
              Export orders
            </Button>
          </>
        }
      />
      <div className="overview-toolbar">
        <div className="section-tabs">
          <span className="selected">Business overview</span>
          <Link to="/analytics">
            Detailed analytics <ArrowUpRight size={13} />
          </Link>
        </div>
        <span className="live-label">
          <i />{' '}
          {user?.workspace_name?.includes('Demo')
            ? 'Sample workspace data'
            : 'Connected to your workspace'}
        </span>
      </div>
      <div className="stats-grid">
        <StatCard
          label="Total revenue"
          value={money(t.revenue)}
          detail="Recognized from final outcomes"
          icon={<Banknote size={19} />}
        />
        <StatCard
          label="Net profit"
          value={money(t.net_profit)}
          detail={`${number(t.margin)}% net margin · after expenses`}
          icon={<ChartNoAxesCombined size={19} />}
          accent
        />
        <StatCard
          label="Total orders"
          value={number(d.order_count)}
          detail={`${ACTIVE_SHIPMENT_STATUSES.reduce((sum, status) => sum + (s[status] || 0), s.CREATED || 0)} orders in progress`}
          icon={<ShoppingBag size={19} />}
        />
        <StatCard
          label="Delivery success"
          value={`${delivery}%`}
          detail={`${s.DELIVERED} delivered of ${finalCount} resolved shipments`}
          icon={<PackageCheck size={19} />}
        />
      </div>
      <div className="dashboard-charts">
        <section className="card performance-card">
          <div className="card-heading">
            <div>
              <h2>
                Revenue & profit{' '}
                <span title="Order creation cohort; only final outcomes contribute revenue and profit.">
                  <CircleHelp size={14} />
                </span>
              </h2>
              <p>A little perspective on your progress.</p>
            </div>
            <Link className="icon-button" to="/analytics" aria-label="View detailed analytics">
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="chart-summary">
            <strong>{money(t.revenue)}</strong>
            <div className="chart-legend">
              <span>
                <i style={{ background: 'var(--green)' }} />
                Revenue
              </span>
              <span>
                <i style={{ background: 'var(--chart-secondary)' }} />
                Order profit
              </span>
            </div>
          </div>
          <RevenueChart data={d.daily} />
          <div className="chart-footer">
            <span>
              <i className="tiny-dot" /> Order creation cohort · PKR
            </span>
            <span>
              {d.period.start} — {d.period.end}
            </span>
          </div>
        </section>
        <section className="card order-status-card">
          <div className="card-heading">
            <div>
              <h2>Order breakdown</h2>
              <p>From your store to their door.</p>
            </div>
            <ShoppingBag size={18} className="muted" />
          </div>
          <div className="status-total">
            <strong>{number(d.order_count)}</strong>
            <span>total orders</span>
          </div>
          <div className="stacked-bar">
            {statusItems
              .filter((i) => i.value)
              .map((i) => (
                <span
                  title={`${i.label}: ${i.value}`}
                  key={i.label}
                  style={{ width: `${(i.value / d.order_count) * 100}%`, background: i.color }}
                />
              ))}
          </div>
          <div className="status-list">
            {statusItems.map(({ label, value, color, icon: Icon }) => (
              <div key={label}>
                <span>
                  <Icon size={15} style={{ color }} />
                  {label}
                </span>
                <strong>
                  {number(value)}{' '}
                  <small>{d.order_count ? Math.round((value / d.order_count) * 100) : 0}%</small>
                </strong>
              </div>
            ))}
          </div>
          <Link to="/orders" className="status-footer">
            View all orders <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <div className="insight-banner">
        <span className="insight-icon">
          <Sparkles size={21} />
        </span>
        <div>
          <strong>A clearer view of what’s ahead.</strong>
          <p>
            {money(t.expected_profit)} in expected profit from open orders.
            {d.pending_returns > 0
              ? ` ${d.pending_returns} returned parcels are awaiting inspection.`
              : ' Revenue is recognized when an order reaches a final outcome.'}
          </p>
        </div>
        <Link to="/analytics">
          Explore insights <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="dashboard-bottom">
        <section className="card recent-orders">
          <div className="card-heading">
            <div>
              <h2>
                Recent orders <span className="count-label">{d.order_count}</span>
              </h2>
              <p>The latest activity in your store.</p>
            </div>
            <Link to="/orders" className="text-link">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {d.recent_orders.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Order / Customer</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Profit</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.recent_orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <div className="person-cell">
                          <span className="avatar-table">{initials(o.customer_name || 'C')}</span>
                          <div>
                            <Link to={`/orders/${o.id}`}>{o.customer_name}</Link>
                            <small>{o.number}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge status={o.status} />
                      </td>
                      <td className="amount">{money(o.financials.net_sale)}</td>
                      <td
                        className={
                          Number(
                            o.financials.is_final
                              ? o.financials.profit
                              : o.financials.expected_profit,
                          ) < 0
                            ? 'negative'
                            : 'positive'
                        }
                      >
                        {money(
                          o.financials.is_final
                            ? o.financials.profit
                            : o.financials.expected_profit,
                        )}
                        {!o.financials.is_final && <small className="table-sub">Estimated</small>}
                      </td>
                      <td>
                        <Link
                          to={`/orders/${o.id}`}
                          className="icon-button"
                          aria-label={`View ${o.number}`}
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Your first order starts here"
              action={
                <Link className="btn btn-primary" to="/orders?new=1">
                  <Plus size={15} />
                  Create an order
                </Link>
              }
            />
          )}
        </section>
        <section className="card top-products">
          <div className="card-heading">
            <div>
              <h2>Top performers</h2>
              <p>Products pulling their weight.</p>
            </div>
            <span className="small-tag">By profit</span>
          </div>
          {d.products.length ? (
            <div className="product-ranking">
              {d.products.slice(0, 4).map((p, i) => (
                <Link to="/analytics" key={p.id}>
                  <span className={`product-thumb tint-${i}`}>
                    <Package size={21} />
                  </span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.units} units delivered</small>
                  </div>
                  <div className="ranking-value">
                    <strong>{money(p.profit)}</strong>
                    <small>
                      {p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : 0}% margin
                    </small>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Insights are on their way"
              description="Product rankings appear as orders are finalized."
            />
          )}
          <div className="inventory-alert">
            <span>
              <Package size={16} />
              {d.low_stock.length
                ? `${d.low_stock.length} product${d.low_stock.length > 1 ? 's' : ''} running low`
                : `${compact(d.inventory_value)} in inventory`}
            </span>
            <Link to="/inventory" aria-label="View inventory">
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
