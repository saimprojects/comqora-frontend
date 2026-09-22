import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Download,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, exportOrders } from '../../lib/api'
import { money, initials, date } from '../../lib/format'
import { Badge, Button, Empty, ErrorState, Loading, PageHeading } from '../../components/ui'
import { useAuth } from '../auth/AuthContext'
import NewOrder from './NewOrder'
import SearchField from '../../components/SearchField'
export default function Orders() {
  const [params, setParams] = useSearchParams(),
    { user } = useAuth()
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1)
  const [creating, setCreating] = useState(params.has('new'))
  const customer = params.get('customer')
  const filter = `?page=${page}&search=${encodeURIComponent(search)}&status=${status}${customer ? `&customer=${customer}` : ''}`
  const query = useQuery({
    queryKey: ['orders', filter],
    queryFn: () => api(`orders/${filter}`),
    refetchInterval: 15000,
  })
  const statuses = [
    '',
    'CREATED',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'RETURN_IN_TRANSIT',
    'DELIVERED',
    'RETURNED',
    'DELIVERY_FAILED',
    'CANCELLED',
  ]
  return (
    <>
      <PageHeading
        eyebrow="EVERY ORDER HAS A STORY"
        title="Keep things moving."
        description="Manage the journey from a new order to a happy customer."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => exportOrders(filter).catch((e) => toast.error(e.message))}
            >
              <Download size={16} />
              Export
            </Button>
            {user?.role !== 'viewer' && (
              <Button onClick={() => setCreating(true)}>
                <Plus size={17} />
                Create order
              </Button>
            )}
          </>
        }
      />
      <section className="card">
        <div className="order-tabs">
          {statuses.map((s) => (
            <button
              key={s}
              className={status === s ? 'selected' : ''}
              onClick={() => {
                setStatus(s)
                setPage(1)
              }}
            >
              {s ? s.toLowerCase().replaceAll('_', ' ') : 'All orders'}
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <SearchField
            placeholder="Search orders, customers, tracking IDs…"
            label="Search orders"
            value={search}
            onValueChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
          />
          <span className="results-count" role="status">
            <SlidersHorizontal size={14} /> {query.data?.count ?? '—'} orders{' '}
            {customer && (
              <button className="text-link" onClick={() => setParams({})}>
                Clear customer filter
              </button>
            )}
          </span>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} retry={query.refetch} />
        ) : !query.data.results.length ? (
          <Empty
            title={
              search || status ? 'No orders match these filters' : 'Ready for your first order?'
            }
            description="Create an order to reserve stock and get a complete profit breakdown."
            action={
              user?.role !== 'viewer' && (
                <Button onClick={() => setCreating(true)}>
                  <Plus size={15} />
                  Create order
                </Button>
              )
            }
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Courier</th>
                  <th>Status</th>
                  <th>Order value</th>
                  <th>Profit / estimate</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {query.data.results.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="order-number" to={`/orders/${o.id}`}>
                        {o.number}
                      </Link>
                      <small className="table-sub">{date(o.created_at)}</small>
                    </td>
                    <td>
                      <div className="person-cell">
                        <span className="avatar-table">{initials(o.customer_name || 'C')}</span>
                        <div>
                          <strong>{o.customer_name}</strong>
                          <small>{o.city}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="courier-label">{o.courier_name}</span>
                      <small className="table-sub">{o.tracking_id || 'Not dispatched'}</small>
                    </td>
                    <td>
                      <Badge status={o.status} />
                    </td>
                    <td className="amount">
                      {money(o.financials.net_sale)}
                      <small className="table-sub">{o.payment_type}</small>
                    </td>
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
                        o.financials.is_final ? o.financials.profit : o.financials.expected_profit,
                      )}
                      <small className="table-sub">{o.financials.state.toLowerCase()}</small>
                    </td>
                    <td>
                      <Link
                        className="icon-button"
                        aria-label={`Open order ${o.number}`}
                        to={`/orders/${o.id}`}
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {query.data && (
          <div className="pagination">
            <span>
              {query.data.count
                ? `Showing ${(page - 1) * 25 + 1}–${Math.min(page * 25, query.data.count)} of ${query.data.count} orders`
                : '0 orders'}
            </span>
            <div>
              <Button
                variant="secondary"
                disabled={!query.data.previous}
                onClick={() => setPage(page - 1)}
              >
                <ArrowLeft size={15} />
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={!query.data.next}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </section>
      {creating && user?.role !== 'viewer' && (
        <NewOrder
          onClose={() => {
            setCreating(false)
            if (params.has('new')) setParams({})
          }}
        />
      )}
    </>
  )
}
