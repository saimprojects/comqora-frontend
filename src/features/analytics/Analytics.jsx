import {
  Banknote,
  ChartNoAxesCombined,
  TrendingUp,
  RotateCcw,
  ArrowUpRight,
  Package,
  Megaphone,
  Wallet,
  Truck,
} from 'lucide-react'
import { PageHeading, StatCard, Loading, ErrorState, Empty } from '../../components/ui'
import { money } from '../../lib/format'
import { RevenueChart, useAnalytics } from './shared'
export default function Analytics() {
  const { data: d, isPending, error, refetch, selector } = useAnalytics()
  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} retry={refetch} />
  const t = d.totals
  const costs = [
    { name: 'Product / FIFO', value: Number(t.product), icon: Package, color: 'var(--green)' },
    {
      name: 'Courier & returns',
      value: Number(t.courier),
      icon: Truck,
      color: 'var(--chart-cyan)',
    },
    {
      name: 'Order advertising spend',
      value: Number(t.ads || 0),
      icon: Megaphone,
      color: 'var(--success)',
    },
    { name: 'Packaging', value: Number(t.packaging), icon: Package, color: 'var(--amber)' },
    {
      name: 'Other order costs',
      value: Number(t.other),
      icon: Wallet,
      color: 'var(--chart-violet)',
    },
    {
      name: 'Business expenses',
      value: Number(t.business_expenses),
      icon: Wallet,
      color: 'var(--danger)',
    },
    {
      name: 'Unallocated campaigns',
      value: Number(t.unallocated_ads),
      icon: Megaphone,
      color: 'var(--muted)',
    },
  ]
  const sum = costs.reduce((n, c) => n + c.value, 0)
  return (
    <>
      <PageHeading
        eyebrow="LESS GUESSWORK. BETTER DECISIONS."
        title="Your business, by the numbers."
        description="Understand what sells, what costs, and what actually earns."
        actions={selector}
      />
      <div className="stats-grid">
        <StatCard
          label="Realized order profit"
          value={money(t.realized_profit)}
          detail="Includes return and cancellation outcomes"
          icon={<Banknote size={19} />}
        />
        <StatCard
          label="Net business profit"
          value={money(t.net_profit)}
          detail="After expenses & all advertising spend"
          accent
          icon={<ChartNoAxesCombined size={19} />}
        />
        <StatCard
          label="Expected profit"
          value={money(t.expected_profit)}
          detail="Open orders · not yet realized"
          icon={<TrendingUp size={19} />}
        />
        <StatCard
          label="Return & cancellation loss"
          value={money(t.return_loss)}
          detail="Final losses after inventory recovery"
          icon={<RotateCcw size={19} />}
        />
      </div>
      <div className="dashboard-charts">
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>The growth picture</h2>
              <p>Realized revenue and order profit by creation date.</p>
            </div>
            <div className="chart-legend">
              <span>
                <i />
                Revenue
              </span>
              <span>
                <i style={{ background: 'var(--chart-secondary)' }} />
                Profit
              </span>
            </div>
          </div>
          <RevenueChart data={d.daily} />
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Where the money goes</h2>
              <p>{money(sum)} in recognized costs</p>
            </div>
          </div>
          <div className="cost-bars">
            {costs.map((c) => (
              <div key={c.name}>
                <div>
                  <span>
                    <c.icon size={14} />
                    {c.name}
                  </span>
                  <strong>{money(c.value)}</strong>
                </div>
                <div className="cost-track">
                  <i
                    style={{ width: `${sum ? (c.value / sum) * 100 : 0}%`, background: c.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="card section-gap">
        <div className="card-heading">
          <div>
            <h2>Product profitability</h2>
            <p>Actual item FIFO costs. Shared costs and discounts allocated by sale value.</p>
          </div>
          <ArrowUpRight size={18} />
        </div>
        {d.products.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Delivered units</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                  <th>Margin</th>
                  <th>Return rate</th>
                </tr>
              </thead>
              <tbody>
                {d.products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <small className="table-sub">{p.sku}</small>
                    </td>
                    <td>{p.units}</td>
                    <td>{money(p.revenue)}</td>
                    <td className={p.profit < 0 ? 'negative' : 'positive'}>{money(p.profit)}</td>
                    <td>{p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : 0}%</td>
                    <td>{p.ordered ? ((p.returned / p.ordered) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </section>
      <section className="card section-gap">
        <div className="card-heading">
          <div>
            <h2>Courier performance</h2>
            <p>Compare delivery success, actual shipping spend, and profit.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Courier</th>
                <th>Shipments</th>
                <th>Delivered</th>
                <th>Returned</th>
                <th>Average delivery</th>
                <th>Shipping cost</th>
                <th>Order profit</th>
              </tr>
            </thead>
            <tbody>
              {d.couriers.map((c) => (
                <tr key={c.name}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>{c.orders}</td>
                  <td>{c.delivered}</td>
                  <td>{c.returned}</td>
                  <td>
                    {c.delivered ? (c.delivery_days / c.delivered).toFixed(1) + ' days' : '—'}
                  </td>
                  <td>{money(c.cost)}</td>
                  <td className={c.profit < 0 ? 'negative' : 'positive'}>{money(c.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!d.couriers.length && <Empty />}
      </section>
      <div className="three-col section-gap">
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Marketing efficiency</h2>
              <p>Returns included. Clarity delivered.</p>
            </div>
            <Megaphone size={19} />
          </div>
          <div className="summary-list">
            <div>
              <span>Ad spend in scope</span>
              <strong>{money(t.ad_spend)}</strong>
            </div>
            <div>
              <span>Cost per order</span>
              <strong>{money(t.cost_per_order)}</strong>
            </div>
            <div>
              <span>Cost per delivery</span>
              <strong>{money(t.cost_per_delivery)}</strong>
            </div>
            <div>
              <span>Delivered ROAS</span>
              <strong>{Number(t.delivered_roas).toFixed(2)}×</strong>
            </div>
            <div>
              <span>Placed ROAS</span>
              <strong>{Number(t.placed_roas).toFixed(2)}×</strong>
            </div>
            <div>
              <span>Net profit / ad spend</span>
              <strong>{Number(t.profit_roas).toFixed(2)}×</strong>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Your customers</h2>
              <p>People behind the orders.</p>
            </div>
          </div>
          <div className="summary-list">
            <div>
              <span>Active customers</span>
              <strong>{d.customers.active}</strong>
            </div>
            <div>
              <span>New customers</span>
              <strong>{d.customers.new}</strong>
            </div>
            <div>
              <span>Repeat customers</span>
              <strong>{d.customers.repeat}</strong>
            </div>
            <div>
              <span>Revenue per delivered order</span>
              <strong>
                {money(
                  d.statuses.DELIVERED ? Number(t.delivered_revenue) / d.statuses.DELIVERED : 0,
                )}
              </strong>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Across Pakistan</h2>
              <p>Delivered share of all orders.</p>
            </div>
          </div>
          <div className="summary-list">
            {d.locations
              .sort((a, b) => b.orders - a.orders)
              .slice(0, 5)
              .map((c) => (
                <div key={c.name}>
                  <span>
                    {c.name}
                    <small> · {c.orders} orders</small>
                  </span>
                  <strong>{c.orders ? Math.round((c.delivered / c.orders) * 100) : 0}%</strong>
                </div>
              ))}
          </div>
        </section>
      </div>
      <p className="analytics-note">
        Reporting basis: {d.period.basis} This is a management P&L, not a courier settlement or bank
        reconciliation. Expected profit is excluded from net profit.
      </p>
    </>
  )
}
