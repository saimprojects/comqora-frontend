import Select from '../../components/Select'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Package,
  Layers3,
  ArrowUpRight,
  Upload,
  Undo2,
  Check,
  Truck,
  Calculator,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, all, patch, post } from '../../lib/api'
import { date, money, number } from '../../lib/format'
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  PageHeading,
} from '../../components/ui'
import { configs } from './config'
import { useAuth } from '../auth/AuthContext'
import { CostsEditor, Segmented } from '../../components/PricingControls'
import { datePresets, dateRange } from '../../lib/dateRanges'
import { landedPreview } from '../../lib/pricing'
import SearchField from '../../components/SearchField'
import { CashModal } from '../banking/Bank'
import PrintPreview from '../printing/PrintPreview'
export default function ResourcePage({ resource }) {
  const config = configs[resource],
    client = useQueryClient(),
    { user } = useAuth()
  const canWrite =
    ['owner', 'manager'].includes(user.role) || (resource === 'customers' && user.role === 'staff')
  const [expensePayment, setExpensePayment] = useState(null)
  const [printOpen, setPrintOpen] = useState(false)
  const bankAccounts = useQuery({
    queryKey: ['bank', 'accounts'],
    queryFn: () => all('bank-accounts'),
    enabled: !!expensePayment,
  })
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const [allocation, setAllocation] = useState(null),
    [mode, setMode] = useState('skip_existing'),
    [quoteCourier, setQuoteCourier] = useState(null),
    [weight, setWeight] = useState('0.5')
  const [categoryFilter, setCategoryFilter] = useState(''),
    [categoryId, setCategoryId] = useState(''),
    [categoryName, setCategoryName] = useState(''),
    [addingCategory, setAddingCategory] = useState(false)
  const [purchaseMode, setPurchaseMode] = useState('UNIT'),
    [extraCosts, setExtraCosts] = useState([]),
    [numeric, setNumeric] = useState({})
  const [provincial, setProvincial] = useState(false),
    [cityPricing, setCityPricing] = useState(false),
    [quoteZone, setQuoteZone] = useState('OUTSIDE_PROVINCE')
  const [period, setPeriod] = useState('all'),
    [dates, setDates] = useState(dateRange('today')),
    [campaignPeriod, setCampaignPeriod] = useState('today'),
    [campaignDates, setCampaignDates] = useState(dateRange('today'))
  const categories = useQuery({
    queryKey: ['categories-options'],
    queryFn: () => all('categories'),
    enabled: resource === 'products',
  })
  const listRange = period === 'custom' ? dates : dateRange(period)
  const filterQuery =
    resource === 'products' && categoryFilter
      ? `&category_record=${categoryFilter}`
      : resource === 'marketing' && period !== 'all'
        ? `&start_date=${listRange.start_date}&end_date=${listRange.end_date}`
        : ''
  const [imageUrl, setImageUrl] = useState('')
  const [shippingService, setShippingService] = useState('TCS')
  const query = useQuery({
    queryKey: [config.endpoint, search, page, filterQuery],
    queryFn: () =>
      api(
        `${config.endpoint}/?page=${page}&page_size=12&search=${encodeURIComponent(search)}${filterQuery}`,
      ),
  })
  const products = useQuery({
    queryKey: ['product-options'],
    queryFn: () => all('products'),
    enabled: resource === 'inventory' && editing !== null,
  })
  const quote = useQuery({
    queryKey: ['courier-quote', quoteCourier?.id, weight, quoteZone],
    queryFn: () =>
      api(
        `couriers/${quoteCourier.id}/quote/?weight=${encodeURIComponent(weight)}&zone=${quoteZone}`,
      ),
    enabled: !!quoteCourier && Number(weight) > 0,
  })
  async function invalidate() {
    await client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'auth' })
  }
  function open(record = {}) {
    setEditing(record)
    setImageUrl(record.image_url || '')
    setShippingService(record.provider || 'TCS')
    setCategoryId(record.category_id || '')
    setCategoryName('')
    setAddingCategory(false)
    setPurchaseMode(record.purchase_mode || 'UNIT')
    setExtraCosts(record.extra_fees || record.extra_costs || [])
    setNumeric(record)
    setProvincial(record.provincial_pricing || false)
    setCityPricing(record.city_pricing || false)
    setCampaignPeriod('today')
    setCampaignDates(dateRange('today'))
    setError('')
  }
  async function createCategory() {
    if (!categoryName.trim()) return
    setBusy(true)
    setError('')
    try {
      const result = await post('categories/', { name: categoryName.trim() })
      await client.invalidateQueries({ queryKey: ['categories-options'] })
      setCategoryId(result.id)
      setAddingCategory(false)
      setCategoryName('')
      toast.success('Category created')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const quantity = Number(numeric.purchased_quantity || 0)
  const landed = landedPreview({
    quantity,
    amount: numeric.purchase_amount,
    mode: purchaseMode,
    transport: numeric.transport_cost,
    imports: numeric.import_cost,
    other: extraCosts,
  })
  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(e.currentTarget),
      data = {}
    config.fields.forEach((f) => {
      data[f.key] =
        f.type === 'checkbox'
          ? form.has(f.key)
          : f.type === 'image'
            ? imageUrl
            : (form.get(f.key) ?? '')
    })
    if (resource === 'products') data.category_id = categoryId
    if (resource === 'inventory')
      Object.assign(data, { purchase_mode: purchaseMode, extra_costs: extraCosts })
    if (resource === 'couriers')
      Object.assign(data, {
        extra_fees: extraCosts,
        provincial_pricing: provincial,
        city_pricing: cityPricing,
        same_province_rate: form.get('same_province_rate') ?? editing.same_province_rate ?? '0',
        outside_province_rate:
          form.get('outside_province_rate') ?? editing.outside_province_rate ?? '0',
        same_city_rate: form.get('same_city_rate') ?? editing.same_city_rate ?? '0',
      })
    try {
      if (editing.id) await patch(`${config.endpoint}/${editing.id}/`, data)
      else await post(`${config.endpoint}/`, data)
      await invalidate()
      setEditing(null)
      toast.success(`${config.singular[0].toUpperCase() + config.singular.slice(1)} saved`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  async function allocate(undo = false) {
    setBusy(true)
    setError('')
    try {
      await post(`campaigns/${allocation.id}/${undo ? 'undo' : 'allocate'}/`, { mode })
      await invalidate()
      setAllocation(null)
      toast.success(
        undo
          ? 'Allocation undone. History retained.'
          : 'Campaign spend allocated to eligible orders.',
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  async function upload(file) {
    if (!file) return
    setBusy(true)
    setError('')
    const data = new FormData()
    data.append('image', file)
    try {
      const result = await api('products/upload/', { method: 'POST', body: data })
      setImageUrl(result.url)
      toast.success('Image uploaded')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  function value(row, key, type) {
    if (type === 'money') return <span className="amount">{money(row[key])}</span>
    if (type === 'date') return date(row[key])
    if (type === 'active') return <Badge status={row[key] ? 'ACTIVE' : 'INACTIVE'} />
    if (type === 'allocation') return <Badge status={row[key] ? 'ALLOCATED' : 'UNALLOCATED'} />
    if (key === 'name') return <strong>{row[key]}</strong>
    return row[key] ?? '—'
  }
  return (
    <>
      {printOpen && (
        <PrintPreview
          kind={resource}
          filters={`search=${encodeURIComponent(search)}${filterQuery}`}
          filterLabel={[
            search && `Search: ${search}`,
            categoryFilter &&
              `Category: ${categories.data?.find((c) => c.id === categoryFilter)?.name || categoryFilter}`,
          ]
            .filter(Boolean)
            .join(' · ')}
          onClose={() => setPrintOpen(false)}
        />
      )}
      <PageHeading
        eyebrow={
          resource === 'marketing' || resource === 'expenses'
            ? 'BUSINESS PERFORMANCE'
            : 'YOUR DAILY OPERATIONS'
        }
        title={config.title}
        description={config.description}
        actions={
          <>
            {['products', 'inventory', 'customers', 'packaging', 'couriers'].includes(resource) && (
              <Button variant="secondary" onClick={() => setPrintOpen(true)}>
                Print report
              </Button>
            )}
            {canWrite && (
              <Button onClick={() => open()}>
                <Plus size={17} />
                Add {config.singular}
              </Button>
            )}
          </>
        }
      />
      {resource === 'expenses' && (
        <div className="info-banner">
          <div>
            <strong>Business costs and bank payments are linked, not counted twice.</strong>
            <p>
              Add rent, salaries, software and other overheads here to track profit. Then use Record
              payment to select the bank or wallet you paid from. Existing expenses do not
              automatically deduct cash. “Left to record” means no linked bank payment, not proof a
              bill is unpaid.
            </p>
            <Link className="text-link" to="/bank">
              View bank accounts & payment history →
            </Link>
          </div>
        </div>
      )}
      {expensePayment &&
        (bankAccounts.isLoading ? (
          <Loading />
        ) : bankAccounts.error ? (
          <Modal title="Bank accounts unavailable" onClose={() => setExpensePayment(null)}>
            <ErrorState error={bankAccounts.error} retry={bankAccounts.refetch} />
          </Modal>
        ) : (
          <CashModal
            expense={expensePayment}
            accounts={bankAccounts.data || []}
            onClose={() => setExpensePayment(null)}
            onSaved={invalidate}
          />
        ))}
      {['marketing', 'products'].includes(resource) && (
        <div className="info-banner">
          <div>
            <strong>WhatsApp product campaigns</strong>
            <p>
              Share products with enabled WhatsApp customers using approved, rate-limited
              announcements.
            </p>
            <Link className="text-link" to="/whatsapp">
              Open WhatsApp campaigns →
            </Link>
          </div>
        </div>
      )}
      {resource === 'inventory' && (
        <div className="info-banner">
          <Layers3 size={20} />
          <div>
            <strong>First in. First out. Always traceable.</strong>
            <p>
              Stock is reserved when an order is created and deducted at dispatch. Reusable returns
              go back to their original batch.
            </p>
          </div>
        </div>
      )}
      {resource === 'couriers' && (
        <div className="info-banner">
          <Truck size={20} />
          <div>
            <strong>Your contracts power every order estimate.</strong>
            <p>
              Regional contracts and custom fees are saved with every order. Supported services use
              Run Courier or PostEx; Others remain manual.
            </p>
          </div>
        </div>
      )}
      {resource === 'marketing' && (
        <div className="info-banner">
          <ArrowUpRight size={20} />
          <div>
            <strong>One spend. A clear allocation.</strong>
            <p>
              Split spend equally across date-range orders. Skip orders with existing ad costs, or
              explicitly add this campaign too. Undo retains the full history.
            </p>
          </div>
        </div>
      )}
      <section
        className={`card resource-card ${resource === 'products' ? 'product-resource' : ''}`}
      >
        <div className="table-toolbar">
          <SearchField
            label={`Search ${resource}`}
            placeholder={`Search ${resource}…`}
            value={search}
            onValueChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
          />
          <span className="results-count" role="status">
            {query.data?.count ?? '—'}{' '}
            {resource === 'inventory'
              ? 'batches'
              : resource === 'marketing'
                ? 'campaigns'
                : resource}
          </span>
          {resource === 'products' && (
            <Select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All categories</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          {resource === 'marketing' && (
            <Select
              aria-label="Campaign date filter"
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">All dates</option>
              {datePresets.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </div>
        {resource === 'marketing' && period === 'custom' && (
          <div className="date-filter-row">
            <Field label="From">
              <input
                type="date"
                value={dates.start_date}
                max={dates.end_date}
                onChange={(e) => {
                  setDates({ ...dates, start_date: e.target.value })
                  setPage(1)
                }}
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                min={dates.start_date}
                value={dates.end_date}
                onChange={(e) => {
                  setDates({ ...dates, end_date: e.target.value })
                  setPage(1)
                }}
              />
            </Field>
          </div>
        )}
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} retry={query.refetch} />
        ) : !query.data.results.length ? (
          <Empty
            title={search ? 'No matches found' : `Add your first ${config.singular}`}
            description={
              search ? 'Try a different search.' : 'Your workspace is ready for this next step.'
            }
            action={
              canWrite &&
              !search && (
                <Button onClick={() => open()}>
                  <Plus size={15} />
                  Add {config.singular}
                </Button>
              )
            }
          />
        ) : resource === 'products' ? (
          <div className="product-grid">
            {query.data.results.map((p, i) => (
              <article className="product-card" key={p.id}>
                <div className={`product-image tint-${i % 4}`}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} />
                  ) : (
                    <Package size={55} strokeWidth={1.25} />
                  )}
                  <span
                    className={`stock-chip ${p.available <= p.low_stock_threshold ? 'low' : ''}`}
                  >
                    {p.available <= p.low_stock_threshold ? 'Low stock' : 'In stock'}
                  </span>
                  {canWrite && (
                    <button
                      className="product-edit icon-button"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => open(p)}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
                <div className="product-card-body">
                  <span className="eyebrow">{p.category}</span>
                  <h3>{p.name}</h3>
                  <p>{p.sku}</p>
                  <div>
                    <strong>{money(p.selling_price)}</strong>
                    <span>{number(p.available)} available</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {config.columns.map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {query.data.results.map((row) => (
                  <tr key={row.id}>
                    {config.columns.map(([key, , type]) => (
                      <td key={key}>{value(row, key, type)}</td>
                    ))}
                    <td>
                      <div className="row-actions">
                        {canWrite && resource === 'expenses' && (
                          <Button
                            variant="secondary"
                            disabled={Number(row.bank_remaining) <= 0}
                            onClick={() => setExpensePayment(row)}
                          >
                            {Number(row.bank_remaining) <= 0
                              ? 'Payment recorded'
                              : 'Record payment'}
                          </Button>
                        )}
                        {resource === 'customers' && (
                          <Link
                            className="icon-button"
                            to={`/orders?customer=${row.id}`}
                            aria-label={`View orders for ${row.name}`}
                          >
                            <ArrowUpRight size={16} />
                          </Link>
                        )}
                        {resource === 'couriers' && (
                          <button
                            className="icon-button"
                            aria-label={`Calculate ${row.name} shipping`}
                            onClick={() => setQuoteCourier(row)}
                          >
                            <Calculator size={16} />
                          </button>
                        )}
                        {canWrite && config.editable && (
                          <button
                            className="icon-button"
                            onClick={() => open(row)}
                            aria-label={`Edit ${row.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canWrite && resource === 'marketing' && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setAllocation(row)
                              setError('')
                            }}
                          >
                            {row.allocated ? (
                              <>
                                <Undo2 size={14} />
                                Undo
                              </>
                            ) : (
                              <>
                                Allocate
                                <ArrowUpRight size={14} />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {query.data?.count > 12 && (
          <div className="pagination">
            <span>
              Page {page} of {Math.ceil(query.data.count / 12)}
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
      {editing !== null && (
        <Modal
          title={`${editing.id ? 'Edit' : 'Add'} ${config.singular}`}
          description={
            resource === 'inventory'
              ? 'Landed unit cost includes purchase, transport, and import costs. Receipts are immutable.'
              : `Keep your ${resource} up to date.`
          }
          onClose={() => !busy && setEditing(null)}
        >
          <form onSubmit={save}>
            {resource === 'inventory' && (
              <Segmented
                label="Purchase amount entered as"
                value={purchaseMode}
                onChange={setPurchaseMode}
                options={[
                  ['UNIT', 'Per unit'],
                  ['TOTAL', 'Total pieces amount'],
                ]}
              />
            )}
            {resource === 'marketing' && (
              <Field label="Campaign date range">
                <Select
                  value={campaignPeriod}
                  onChange={(e) => {
                    setCampaignPeriod(e.target.value)
                    if (e.target.value !== 'custom') setCampaignDates(dateRange(e.target.value))
                  }}
                >
                  {datePresets.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {resource === 'couriers' && (
              <p
                className={shippingService === 'Others' ? 'form-warning' : 'dialog-copy'}
                role="status"
              >
                {shippingService === 'Others'
                  ? 'Auto Tracking not available for other shipping services.'
                  : shippingService === 'PostEx'
                    ? 'PostEx tracking uses the server-side merchant token shared by all workspaces.'
                    : 'Automatic tracking uses Run Courier. The shipment must be discoverable by its tracking endpoint.'}
              </p>
            )}
            <div className="form-grid">
              {config.fields.map((f) => (
                <Field
                  key={f.key}
                  label={
                    f.key === 'purchase_amount' && purchaseMode === 'TOTAL'
                      ? 'Total purchase amount (PKR)'
                      : f.label
                  }
                  hint={f.hint}
                >
                  {f.type === 'category' ? (
                    <div className="category-picker">
                      <Select
                        name="category_id"
                        aria-label="Category"
                        required
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                      >
                        <option value="">Select a category</option>
                        {categories.data?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setAddingCategory(!addingCategory)}
                      >
                        + Create new category
                      </button>
                      {addingCategory && (
                        <div className="inline-create">
                          <input
                            aria-label="New category name"
                            maxLength={80}
                            placeholder="Category name"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                          />
                          <Button
                            type="button"
                            loading={busy}
                            disabled={!categoryName.trim()}
                            onClick={createCategory}
                          >
                            Create
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : f.type === 'select' ? (
                    <Select
                      name={f.key}
                      defaultValue={editing[f.key] ?? f.initial ?? ''}
                      required={f.required}
                      onChange={
                        f.key === 'provider' ? (e) => setShippingService(e.target.value) : undefined
                      }
                    >
                      {f.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  ) : f.type === 'product' ? (
                    <Select name={f.key} required defaultValue={editing[f.key] ?? ''}>
                      <option value="">Select a product</option>
                      {products.data?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.sku}
                        </option>
                      ))}
                    </Select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      name={f.key}
                      defaultValue={editing[f.key] ?? ''}
                      required={f.required}
                      rows={3}
                    />
                  ) : f.type === 'checkbox' ? (
                    <input
                      name={f.key}
                      type="checkbox"
                      defaultChecked={Boolean(editing[f.key] ?? f.initial)}
                    />
                  ) : f.type === 'image' ? (
                    <div className="image-upload">
                      {imageUrl && <img src={imageUrl} alt="Product preview" />}
                      <label className="btn btn-secondary">
                        <Upload size={15} />
                        Upload image
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => upload(e.target.files?.[0])}
                        />
                      </label>
                      <input
                        type="url"
                        aria-label="Product image URL"
                        placeholder="Or paste an image URL"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                      <small>Cloudinary · PNG, JPG or WebP · up to 5 MB</small>
                    </div>
                  ) : resource === 'marketing' && f.type === 'date' ? (
                    <input
                      name={f.key}
                      type="date"
                      required
                      value={campaignDates[f.key]}
                      onChange={(e) => {
                        setCampaignDates({ ...campaignDates, [f.key]: e.target.value })
                        setCampaignPeriod('custom')
                      }}
                    />
                  ) : (
                    <input
                      name={f.key}
                      type={f.type || 'text'}
                      defaultValue={editing[f.key] ?? f.initial ?? ''}
                      required={f.required}
                      step={
                        f.key === 'purchased_quantity' || f.key === 'low_stock_threshold'
                          ? '1'
                          : f.type === 'number'
                            ? '0.01'
                            : undefined
                      }
                      min={f.type === 'number' ? (f.min ?? 0) : undefined}
                      onChange={
                        resource === 'inventory'
                          ? (e) => setNumeric({ ...numeric, [f.key]: e.target.value })
                          : undefined
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
            {resource === 'couriers' && (
              <div className="regional-pricing">
                <label className="check-card">
                  <input
                    type="checkbox"
                    checked={provincial}
                    onChange={(e) => setProvincial(e.target.checked)}
                  />
                  <span>
                    <strong>Provincial pricing</strong>
                    <small>Use different base rates within and outside your province.</small>
                  </span>
                </label>
                {provincial && (
                  <div className="form-grid">
                    <Field label="Same province base rate (PKR)">
                      <input
                        name="same_province_rate"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        defaultValue={editing.same_province_rate ?? '0'}
                      />
                    </Field>
                    <Field label="Outside province base rate (PKR)">
                      <input
                        name="outside_province_rate"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        defaultValue={editing.outside_province_rate ?? '0'}
                      />
                    </Field>
                  </div>
                )}
                <label className="check-card">
                  <input
                    type="checkbox"
                    checked={cityPricing}
                    onChange={(e) => setCityPricing(e.target.checked)}
                  />
                  <span>
                    <strong>Same-city pricing</strong>
                    <small>
                      Overrides the provincial or standard base rate for same-city orders.
                    </small>
                  </span>
                </label>
                {cityPricing && (
                  <Field label="Same city base rate (PKR)">
                    <input
                      name="same_city_rate"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      defaultValue={editing.same_city_rate ?? '0'}
                    />
                  </Field>
                )}
              </div>
            )}
            {['inventory', 'couriers'].includes(resource) && (
              <CostsEditor
                label={
                  resource === 'couriers' ? 'Custom courier charges' : 'Additional batch costs'
                }
                value={extraCosts}
                onChange={setExtraCosts}
                percentages={resource === 'couriers'}
              />
            )}
            {resource === 'inventory' && (
              <div className="quote-strip">
                <span>Landed cost per unit</span>
                <strong>{money(landed)}</strong>
                <small>
                  Purchase + transport + import + all named costs, spread over {quantity || '—'}{' '}
                  units. Rounded to 2 decimals.
                </small>
              </div>
            )}
            {categories.isError && resource === 'products' && (
              <p className="form-error">{categories.error.message}</p>
            )}
            {products.isError && <p className="form-error">{products.error.message}</p>}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                loading={busy}
                type="submit"
                disabled={resource === 'products' && !categoryId}
              >
                <Check size={16} />
                Save {config.singular}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {allocation && (
        <Modal
          title={allocation.allocated ? 'Undo ad allocation' : 'Allocate campaign spend'}
          description={`${allocation.name} · ${money(allocation.spend)}`}
          onClose={() => !busy && setAllocation(null)}
        >
          {allocation.allocated ? (
            <p className="dialog-copy">
              This removes this campaign’s allocations from order costs and recalculates profit. The
              allocation history stays available.
            </p>
          ) : (
            <>
              <p className="dialog-copy">
                Spend is shared equally across orders created between {date(allocation.start_date)}{' '}
                and {date(allocation.end_date)}. Any rounding remainder goes to the final order.
              </p>
              <Field label="Allocation mode">
                <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="skip_existing">Skip orders with existing ad costs</option>
                  <option value="add">Add this also — include all orders</option>
                </Select>
              </Field>
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setAllocation(null)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={() => allocate(allocation.allocated)}>
              {allocation.allocated ? 'Undo allocation' : 'Allocate spend'}
            </Button>
          </div>
        </Modal>
      )}
      {quoteCourier && (
        <Modal
          title={`${quoteCourier.name} · Shipping calculator`}
          description="Contract estimate, including weight charges and taxes."
          onClose={() => setQuoteCourier(null)}
        >
          <Field label="Parcel weight (kg)">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </Field>
          <Field label="Delivery region">
            <Select value={quoteZone} onChange={(e) => setQuoteZone(e.target.value)}>
              <option value="OUTSIDE_PROVINCE">Outside province</option>
              <option value="SAME_PROVINCE">Same province</option>
              <option value="SAME_CITY">Same city</option>
            </Select>
          </Field>
          {quote.data && (
            <div className="summary-list">
              {[
                ['Base rate', quote.data.base_rate],
                ['Additional weight', quote.data.extra_weight_charge],
                ['Tax', quote.data.tax],
                ['Fixed charge', quote.data.fixed_charge],
                ...(quote.data.extra_fees || []).map((fee) => [
                  fee.name + (fee.kind === 'PERCENT' ? ` (${fee.amount}%)` : ''),
                  fee.cost,
                ]),
                ['Total forward shipping', quote.data.total],
                ['Return shipping', quote.data.return_rate],
              ].map(([label, v]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{money(v)}</strong>
                </div>
              ))}
            </div>
          )}
          {quote.isError && <p className="form-error">{quote.error.message}</p>}
        </Modal>
      )}
    </>
  )
}
