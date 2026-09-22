import Select from '../../components/Select'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ArrowRight, ShoppingBag, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { all, api, post } from '../../lib/api'
import { Segmented, Quantity } from '../../components/PricingControls'
import { money } from '../../lib/format'
import { orderPreview } from '../../lib/pricing'
import { Button, Field, Loading, ErrorState, Modal } from '../../components/ui'
export default function NewOrder({ onClose }) {
  const client = useQueryClient(),
    navigate = useNavigate()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [newCustomer, setNewCustomer] = useState(false)
  const [items, setItems] = useState([{ product: '', quantity: 1 }]),
    [packs, setPacks] = useState({}),
    [other, setOther] = useState([])
  const [discount, setDiscount] = useState('0'),
    [payment, setPayment] = useState('COD')
  const [courier, setCourier] = useState(''),
    [weight, setWeight] = useState('0.5'),
    [zone, setZone] = useState('OUTSIDE_PROVINCE'),
    [chargesMode, setChargesMode] = useState('ABSORB'),
    [adCost, setAdCost] = useState('0'),
    [customerId, setCustomerId] = useState('')
  const options = useQuery({
    queryKey: ['order-options'],
    queryFn: async () => {
      const [products, customers, couriers, packaging] = await Promise.all([
        all('products'),
        all('customers'),
        all('couriers'),
        all('packaging'),
      ])
      return {
        products: products.filter((p) => p.is_active),
        customers,
        couriers: couriers.filter((c) => c.is_active),
        packaging,
      }
    },
  })
  const quote = useQuery({
    queryKey: ['order-quote', courier, weight, zone],
    queryFn: () =>
      api(`couriers/${courier}/quote/?weight=${encodeURIComponent(weight)}&zone=${zone}`),
    enabled: !!courier && Number(weight) > 0,
  })
  const packRows = (options.data?.packaging || []).map((p) => ({
    id: p.id,
    quantity: packs[p.id] ?? String(Number(p.default_quantity) || 1),
    unit_cost: p.unit_cost,
  }))
  const { subtotal, charges, netSale } = orderPreview({
    items,
    products: options.data?.products,
    packaging: packRows,
    shipping: quote.data?.total,
    discount,
    ads: adCost,
    other,
    mode: chargesMode,
  })
  const selectedCourier = options.data?.couriers.find((c) => c.id === courier)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const f = new FormData(e.currentTarget)
    try {
      let customer = customerId
      if (newCustomer) {
        const created = await post('customers/', {
          name: f.get('customer_name'),
          phone: f.get('phone'),
          city: f.get('city'),
          province: f.get('province'),
          address: f.get('address'),
        })
        customer = created.id
        setCustomerId(created.id)
        setNewCustomer(false)
        await client.invalidateQueries({ queryKey: ['order-options'] })
      }
      const order = await post('orders/', {
        customer,
        courier,
        weight,
        delivery_zone: zone,
        charges_mode: chargesMode,
        payment_type: payment,
        advance_paid:
          payment === 'PREPAID'
            ? Math.max(0, netSale).toFixed(2)
            : payment === 'COD'
              ? '0'
              : f.get('advance_paid'),
        discount,
        ad_cost: adCost,
        notes: f.get('notes'),
        items,
        packaging: packRows
          .filter((p) => Number(p.quantity) > 0)
          .map(({ id, quantity }) => ({ id, quantity })),
        other_costs: other,
      })
      await client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'auth' })
      toast.success('Order created. FIFO stock reserved.')
      onClose()
      navigate(`/orders/${order.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title="Let’s create an order."
      description="A few details now. Complete financial clarity from here on."
      onClose={() => !busy && onClose()}
      wide
    >
      {options.isPending ? (
        <Loading />
      ) : options.error ? (
        <ErrorState error={options.error} retry={options.refetch} />
      ) : (
        <form onSubmit={submit}>
          <div className="form-section-heading">
            <span>01</span>
            <h3>Customer details</h3>
            <Button
              type="button"
              variant="secondary"
              className="new-customer-button"
              aria-expanded={newCustomer}
              onClick={() => setNewCustomer(!newCustomer)}
            >
              {newCustomer ? <Users size={17} /> : <UserPlus size={17} />}
              {newCustomer ? 'Choose existing customer' : 'New customer'}
            </Button>
          </div>
          {newCustomer ? (
            <div className="form-grid">
              <Field label="Full name">
                <input name="customer_name" required />
              </Field>
              <Field label="Phone">
                <input name="phone" type="tel" required />
              </Field>
              <Field label="City">
                <input name="city" required />
              </Field>
              <Field label="Province / territory">
                <input name="province" />
              </Field>
              <Field label="Delivery address">
                <input name="address" required />
              </Field>
            </div>
          ) : (
            <Field label="Customer">
              <Select
                name="customer"
                aria-label="Customer"
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Select a customer</option>
                {options.data.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone} · {c.city} · {c.province} · {c.email}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="form-section-heading">
            <span>02</span>
            <h3>What’s in the order?</h3>
          </div>
          <div className="order-items-form">
            {items.map((item, index) => (
              <div key={index}>
                <Field label={`Product ${index + 1}`}>
                  <Select
                    required
                    value={item.product}
                    onChange={(e) =>
                      setItems(
                        items.map((it, i) =>
                          i === index ? { ...it, product: e.target.value } : it,
                        ),
                      )
                    }
                  >
                    <option value="">Select a product</option>
                    {options.data.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.sku} · {money(p.selling_price)} · {p.available} available
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Quantity">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={item.quantity}
                    onChange={(e) =>
                      setItems(
                        items.map((it, i) =>
                          i === index ? { ...it, quantity: Number(e.target.value) } : it,
                        ),
                      )
                    }
                  />
                </Field>
                <button
                  type="button"
                  className="icon-button"
                  disabled={items.length === 1}
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                  aria-label={`Remove product ${index + 1}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setItems([...items, { product: '', quantity: 1 }])}
          >
            <Plus size={14} />
            Add another product
          </Button>
          <div className="form-section-heading">
            <span>03</span>
            <h3>Delivery & payment</h3>
          </div>
          <div className="form-grid">
            <Field label="Courier contract">
              <Select
                name="courier"
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                required
              >
                <option value="">Select a courier</option>
                {options.data.couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · from {money(c.base_rate)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Parcel weight (kg)">
              <input
                name="weight"
                type="number"
                min="0.01"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </Field>
            <Field
              label="Delivery region"
              hint="Compare the customer's delivery address with your dispatch location."
            >
              <Select value={zone} onChange={(e) => setZone(e.target.value)}>
                <option value="OUTSIDE_PROVINCE">Outside province</option>
                <option value="SAME_PROVINCE">Same province · different city</option>
                <option value="SAME_CITY">Same city</option>
              </Select>
            </Field>
            <Field label="Payment type">
              <Select value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="COD">Cash on delivery</option>
                <option value="PARTIAL">Partial advance</option>
                <option value="PREPAID">Fully prepaid</option>
              </Select>
            </Field>
            <Field label="Discount (PKR)">
              <input
                type="number"
                min="0"
                max={subtotal}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </Field>
            {payment === 'PARTIAL' && (
              <Field label="Advance collected (PKR)">
                <input
                  name="advance_paid"
                  type="number"
                  min="0"
                  max={netSale}
                  step="0.01"
                  required
                />
              </Field>
            )}
            <Field
              label="Direct ad cost (PKR)"
              hint="You can allocate campaign spend later in Marketing."
            >
              <input
                name="ad_cost"
                type="number"
                min="0"
                step="0.01"
                value={adCost}
                onChange={(e) => setAdCost(e.target.value)}
              />
            </Field>
          </div>
          {selectedCourier?.provider === 'Others' && (
            <p className="form-warning">
              Auto Tracking not available for other shipping services. Manual status updates remain
              available.
            </p>
          )}
          {quote.isError && <p className="form-error">{quote.error.message}</p>}
          {quote.data && (
            <div className="quote-strip">
              <span>Shipping · {zone.replaceAll('_', ' ').toLowerCase()}</span>
              <strong>{money(quote.data.total)}</strong>
              <small>Includes weight, tax and custom courier fees.</small>
            </div>
          )}
          <div className="form-section-heading">
            <span>04</span>
            <h3>Packaging & other costs</h3>
          </div>
          {options.data.packaging.length ? (
            <div className="packaging-picker">
              {options.data.packaging.map((p) => (
                <div key={p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {money(p.unit_cost)} / {p.unit}
                    </small>
                  </div>
                  <Quantity
                    label={`${p.name} quantity`}
                    step={p.unit === 'piece' ? 1 : 0.01}
                    value={packs[p.id] ?? String(Number(p.default_quantity) || 1)}
                    onChange={(value) => setPacks({ ...packs, [p.id]: value })}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              Add packaging supplies on the Packaging page to include them here.
            </p>
          )}
          {other.map((c, i) => (
            <div className="other-cost-row" key={i}>
              <input
                aria-label={`Other cost ${i + 1} name`}
                placeholder="Cost name"
                required
                value={c.name}
                onChange={(e) =>
                  setOther(other.map((v, n) => (n === i ? { ...v, name: e.target.value } : v)))
                }
              />
              <input
                aria-label={`Other cost ${i + 1} amount`}
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="PKR"
                value={c.amount}
                onChange={(e) =>
                  setOther(other.map((v, n) => (n === i ? { ...v, amount: e.target.value } : v)))
                }
              />
              <button
                className="icon-button"
                type="button"
                aria-label="Remove other cost"
                onClick={() => setOther(other.filter((_, n) => n !== i))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOther([...other, { name: '', amount: '' }])}
          >
            <Plus size={14} />
            Add other incurred cost
          </Button>
          <div className="section-gap">
            <Field label="Internal notes">
              <textarea name="notes" rows={2} placeholder="Anything your team should know…" />
            </Field>
          </div>
          <div className="charges-choice">
            <Segmented
              label="How should order charges be handled?"
              value={chargesMode}
              onChange={setChargesMode}
              options={[
                ['ABSORB', 'Deduct from sale'],
                ['ADD', 'Add to net sale'],
              ]}
            />
            <p className="muted">
              {chargesMode === 'ABSORB'
                ? 'Customer pays the product sale. Shipping, packaging, direct ads and other costs reduce your profit.'
                : 'Shipping, packaging, direct ads and other costs are added to the customer total. Product purchase cost is excluded. Later campaign allocations do not change the customer bill.'}
            </p>
            <div className="summary-list">
              <div>
                <span>Products after discount</span>
                <strong>{money(subtotal - Number(discount))}</strong>
              </div>
              <div>
                <span>
                  {chargesMode === 'ADD' ? 'Added charges' : 'Costs absorbed (excluding products)'}
                </span>
                <strong>{money(charges)}</strong>
              </div>
            </div>
          </div>
          <div className="order-total-preview">
            <ShoppingBag size={21} />
            <div>
              <small>NET ORDER SALE</small>
              <strong>{money(netSale)}</strong>
            </div>
            <span>
              FIFO and courier costs are calculated
              <br />
              and saved with your order.
            </span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={busy}
              disabled={!quote.data || quote.isFetching || quote.isError}
            >
              Create order
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
