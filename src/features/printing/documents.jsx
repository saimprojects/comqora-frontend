import Decimal from 'decimal.js-light'

export const templates = [
  { id: 'studio', name: 'Studio', note: 'Cobalt accents · contemporary', color: '#334bd4' },
  { id: 'editorial', name: 'Editorial', note: 'Serif headlines · warm paper', color: '#795435' },
  { id: 'ledger', name: 'Ledger', note: 'Ruled details · monochrome', color: '#28313a' },
  { id: 'noir', name: 'Noir', note: 'Dark masthead · bold contrast', color: '#202b3b' },
  { id: 'sage', name: 'Sage', note: 'Soft green · generous space', color: '#326855' },
  { id: 'royal', name: 'Royal', note: 'Navy & gold · formal', color: '#24385d' },
  { id: 'rose', name: 'Rose', note: 'Muted rose · boutique', color: '#974c64' },
  { id: 'compact', name: 'Essential', note: 'Compact A4 · economical', color: '#343c49' },
]

export const cash = (value) =>
  new Decimal(value ?? 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
export const stamp = (value) =>
  value
    ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Karachi',
      })
    : '—'
const dec = (value) => new Decimal(value ?? 0)
const add = (rows, fn) => rows.reduce((sum, row) => sum.plus(fn(row)), dec(0))

export function billAmounts(order) {
  const total = dec(order.subtotal)
    .minus(order.discount || 0)
    .plus(order.customer_charges || 0)
  const retained = dec(order.advance_paid).minus(order.refunded_amount || 0)
  const remainder = total.minus(order.advance_paid || 0)
  return {
    total: total.toFixed(2),
    retained: retained.toFixed(2),
    collection: remainder.gt(0) ? remainder.toFixed(2) : '0.00',
  }
}

export function BrandHeader({ brand, logo, title, reference, subtitle }) {
  return (
    <header className="paper-header">
      <div className="paper-brand">
        {logo && <img src={logo} alt={`${brand.name} logo`} className="paper-logo" />}
        <div>
          <strong>{brand.name}</strong>
          <p>{brand.business_address}</p>
          <p>{[brand.business_phone, brand.business_email].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className="paper-document">
        <span className="paper-eyebrow">{subtitle || 'BUSINESS RECORD'}</span>
        <h1>{title}</h1>
        {reference && <p>{reference}</p>}
      </div>
    </header>
  )
}

function Table({ headings, rows, numeric = [], footer }) {
  return (
    <table className="paper-table">
      <thead>
        <tr>
          {headings.map((h, i) => (
            <th key={h} className={numeric.includes(i) ? 'num' : ''}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j} className={numeric.includes(j) ? 'num' : ''}>
                  {v ?? '—'}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={headings.length}>No records in this selection.</td>
          </tr>
        )}
      </tbody>
      {footer && (
        <tbody className="paper-table-total">
          <tr>
            {footer.map((v, j) => (
              <td key={j} className={numeric.includes(j) ? 'num' : ''}>
                {v}
              </td>
            ))}
          </tr>
        </tbody>
      )}
    </table>
  )
}

export function OrderDocument({
  brand,
  logo,
  order,
  template = 'studio',
  documentType = 'bill',
  sample = false,
}) {
  const amounts = billAmounts(order)
  const customer = order.customer_snapshot || {}
  const receipt = documentType === 'receipt'
  const inactive = ['CANCELLED', 'RETURNED', 'RETURN_IN_TRANSIT'].includes(order.status)
  return (
    <article className={`paper paper-order template-${template}`}>
      {sample && <div className="paper-sample">SAMPLE DOCUMENT · PREVIEW ONLY</div>}
      <BrandHeader
        brand={brand}
        logo={logo}
        title={receipt ? 'Payment receipt' : documentType === 'invoice' ? 'Invoice' : 'Order bill'}
        reference={order.number}
        subtitle="PREPARED WITH CARE"
      />
      <section className="paper-addresses">
        <div>
          <span className="paper-eyebrow">
            {receipt ? 'RECEIVED FROM' : 'BILL TO / DELIVER TO'}
          </span>
          <h2>{customer.name}</h2>
          <p>{customer.address}</p>
          <p>{[customer.city, customer.province].filter(Boolean).join(', ')}</p>
          <p>{customer.phone}</p>
          {customer.email && <p>{customer.email}</p>}
        </div>
        <dl>
          <div>
            <dt>Order date</dt>
            <dd>{stamp(order.created_at)}</dd>
          </div>
          <div>
            <dt>Payment method</dt>
            <dd>{order.payment_type}</dd>
          </div>
          <div>
            <dt>Order status</dt>
            <dd>{order.status?.replaceAll('_', ' ')}</dd>
          </div>
          <div>
            <dt>Courier</dt>
            <dd>{order.courier_name || order.courier_snapshot?.courier || '—'}</dd>
          </div>
          {order.tracking_id && (
            <div>
              <dt>Tracking no.</dt>
              <dd>{order.tracking_id}</dd>
            </div>
          )}
        </dl>
      </section>
      {inactive && (
        <p className="paper-status">
          {order.status.replaceAll('_', ' ')} · Historical order record. No collection requested by
          this document.
        </p>
      )}
      <Table
        headings={['#', 'Description', 'Qty', 'Unit price', 'Amount']}
        numeric={[2, 3, 4]}
        rows={order.items.map((item, i) => [
          i + 1,
          <div key={item.id || i}>
            <strong>{item.name}</strong>
            <small>{item.sku}</small>
          </div>,
          item.quantity,
          cash(item.unit_price),
          cash(dec(item.unit_price).times(item.quantity)),
        ])}
      />
      <section className="paper-bottom">
        <div className="paper-thanks">
          <span className="paper-eyebrow">A NOTE FROM {brand.name}</span>
          <p>{brand.invoice_footer}</p>
          {receipt && (
            <small>
              This receipt acknowledges only the advance or prepaid amount recorded on this order,
              less recorded refunds. Courier COD collections are not included.
            </small>
          )}
          {!receipt && !inactive && (
            <small>
              {order.status === 'DELIVERED'
                ? 'Delivery is recorded. COD collection is shown separately from the advance payment.'
                : 'Keep this document for your order reference.'}
            </small>
          )}
        </div>
        <dl className="paper-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{cash(order.subtotal)}</dd>
          </div>
          <div>
            <dt>Discount</dt>
            <dd>− {cash(order.discount)}</dd>
          </div>
          <div>
            <dt>Customer charges</dt>
            <dd>{cash(order.customer_charges)}</dd>
          </div>
          <div className="paper-grand">
            <dt>Order total · {brand.currency || 'PKR'}</dt>
            <dd>{cash(amounts.total)}</dd>
          </div>
          <div>
            <dt>Recorded advance / prepaid</dt>
            <dd>{cash(order.advance_paid)}</dd>
          </div>
          {Number(order.refunded_amount) > 0 && (
            <div>
              <dt>Recorded refunds</dt>
              <dd>{cash(order.refunded_amount)}</dd>
            </div>
          )}
          {receipt ? (
            <div className="paper-payable">
              <dt>Net receipt · {brand.currency || 'PKR'}</dt>
              <dd>{cash(amounts.retained)}</dd>
            </div>
          ) : (
            !inactive && (
              <div className="paper-payable">
                <dt>
                  {order.status === 'DELIVERED' ? 'COD at delivery' : 'To collect on delivery'} ·{' '}
                  {brand.currency || 'PKR'}
                </dt>
                <dd>{cash(amounts.collection)}</dd>
              </div>
            )
          )}
        </dl>
      </section>
      <footer className="paper-footer">
        <span>
          {brand.name} · {order.number}
        </span>
        <span>
          {receipt ? 'Recorded payment receipt' : 'Order document'} · {brand.currency || 'PKR'}
        </span>
      </footer>
    </article>
  )
}

export function ReportDocument({
  brand,
  logo,
  kind,
  rows = [],
  statement,
  filterLabel = '',
  generatedAt,
}) {
  const titles = {
    inventory: 'Inventory detail',
    products: 'Product inventory',
    customers: 'Customer directory',
    packaging: 'Packaging stock',
    couriers: 'Courier details',
    bank: 'Bank statement',
  }
  let headings = [],
    tableRows = [],
    numeric = [],
    summary = []
  if (kind === 'inventory') {
    headings = [
      'Batch / received',
      'Product',
      'Purchased',
      'On hand',
      'Reserved',
      'Available',
      'Unit cost',
      'Stock value',
    ]
    numeric = [2, 3, 4, 5, 6, 7]
    tableRows = rows.map((r) => [
      <div key={r.id}>
        {r.reference}
        <small>{stamp(r.received_at)}</small>
      </div>,
      r.product_name,
      r.purchased_quantity,
      r.remaining_quantity,
      r.reserved_quantity,
      r.remaining_quantity - r.reserved_quantity,
      cash(r.unit_cost),
      cash(dec(r.unit_cost).times(r.remaining_quantity)),
    ])
    summary = [
      ['Batches', rows.length],
      ['Units on hand', add(rows, (r) => r.remaining_quantity).toString()],
      ['Stock value · PKR', cash(add(rows, (r) => dec(r.unit_cost).times(r.remaining_quantity)))],
    ]
  } else if (kind === 'products') {
    headings = [
      'Product / SKU',
      'Category',
      'On hand',
      'Reserved',
      'Available',
      'Sale price',
      'Status',
    ]
    numeric = [2, 3, 4, 5]
    tableRows = rows.map((r) => [
      <div key={r.id}>
        {r.name}
        <small>{r.sku}</small>
      </div>,
      r.category,
      r.stock,
      r.reserved,
      r.available,
      cash(r.selling_price),
      r.is_active ? 'Active' : 'Inactive',
    ])
  } else if (kind === 'customers') {
    headings = ['Customer', 'Phone / email', 'Delivery address', 'Orders', 'Returns']
    numeric = [3, 4]
    tableRows = rows.map((r) => [
      r.name,
      <div key={r.id}>
        {r.phone}
        <small>{r.email}</small>
      </div>,
      [r.address, r.city, r.province].filter(Boolean).join(', '),
      r.order_count ?? 0,
      r.returned_count ?? 0,
    ])
  } else if (kind === 'packaging') {
    headings = [
      'Packaging item',
      'Unit',
      'On hand',
      'Unit cost',
      'Suggested / order',
      'Stock value',
    ]
    numeric = [2, 3, 4, 5]
    tableRows = rows.map((r) => [
      r.name,
      r.unit,
      r.stock,
      cash(r.unit_cost),
      r.default_quantity,
      cash(dec(r.unit_cost).times(r.stock)),
    ])
    summary = [
      ['Materials', rows.length],
      ['Stock value · PKR', cash(add(rows, (r) => dec(r.unit_cost).times(r.stock)))],
    ]
  } else if (kind === 'bank') {
    headings = ['Date', 'Reference / particulars', 'Money in', 'Money out', 'Balance']
    numeric = [2, 3, 4]
    tableRows = statement.entries.map((r) => [
      stamp(r.date),
      <div key={r.id}>
        <strong>{r.reference}</strong>
        <small>
          {[r.reversal_of_id && 'Reversal', r.statement__reference, r.expense__name, r.notes]
            .filter(Boolean)
            .join(' · ')}
        </small>
      </div>,
      dec(r.amount).gt(0) ? cash(r.amount) : '—',
      dec(r.amount).lt(0) ? cash(dec(r.amount).abs()) : '—',
      cash(r.balance),
    ])
    summary = [
      ['Opening balance', cash(statement.opening_balance)],
      ['Money in', cash(statement.money_in)],
      ['Money out', cash(statement.money_out)],
      ['Closing balance', cash(statement.closing_balance)],
    ]
  }
  const count = kind === 'bank' ? statement.entries.length : rows.length
  return (
    <article className="paper paper-report">
      <BrandHeader
        brand={brand}
        logo={logo}
        title={titles[kind]}
        subtitle="BUSINESS REPORT"
        reference={
          kind === 'bank'
            ? `${statement.account.name}${statement.account.last_four ? ` · ending ${statement.account.last_four}` : ''}`
            : `${count} records`
        }
      />
      <div className="paper-report-meta">
        <span>
          {kind === 'bank'
            ? `${stamp(statement.start_date)} — ${stamp(statement.end_date)}`
            : filterLabel || 'All records'}
        </span>
        <span>Prepared {stamp(generatedAt)} · PKR</span>
      </div>
      {summary.length > 0 && (
        <div className="paper-summary">
          {summary.map(([k, v]) => (
            <div key={k}>
              <span>{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      )}
      {kind === 'couriers' ? (
        <div className="paper-couriers">
          {rows.map((r) => (
            <section key={r.id} className="paper-courier">
              <h2>
                {r.name}
                <span>
                  {r.provider} · {r.is_active ? 'Active' : 'Inactive'}
                </span>
              </h2>
              <dl>
                {[
                  ['Code', r.code],
                  ['Base weight', `${r.base_weight} kg`],
                  ['Base rate', cash(r.base_rate)],
                  ['Additional kg', cash(r.additional_kg_rate)],
                  ['Tax', `${r.tax_percent}%`],
                  ['Fixed charge', cash(r.fixed_charge)],
                  ['Return charge', cash(r.return_rate)],
                  ...(r.city_pricing ? [['Same city', cash(r.same_city_rate)]] : []),
                  ...(r.provincial_pricing
                    ? [
                        ['Same province', cash(r.same_province_rate)],
                        ['Outside province', cash(r.outside_province_rate)],
                      ]
                    : []),
                  ...(r.extra_fees || []).map((f) => [
                    f.name,
                    f.kind === 'PERCENT' ? `${f.amount}%` : cash(f.amount),
                  ]),
                ].map(([k, v], i) => (
                  <div key={i}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      ) : (
        <Table headings={headings} rows={tableRows} numeric={numeric} />
      )}
      <footer className="paper-footer">
        <span>
          {brand.name} · {count} {kind === 'bank' ? 'movements' : 'records'}
        </span>
        <span>
          {kind === 'bank'
            ? 'Internal cash ledger · not a bank-issued statement'
            : 'Internal business record'}{' '}
          · End of report
        </span>
      </footer>
    </article>
  )
}

export const sampleOrder = {
  number: 'ORD-001248',
  created_at: '2026-09-17',
  payment_type: 'PARTIAL',
  status: 'CREATED',
  courier_name: 'Express delivery',
  tracking_id: 'PK-00814260',
  customer_snapshot: {
    name: 'Ayesha Khan',
    address: '24 Garden Avenue, Block B',
    city: 'Lahore',
    province: 'Punjab',
    phone: '+92 300 1234567',
  },
  items: [
    { id: '1', name: 'Everyday canvas tote', sku: 'CT-01', quantity: 2, unit_price: '1850.00' },
    { id: '2', name: 'Ceramic travel cup', sku: 'TC-04', quantity: 1, unit_price: '1250.00' },
  ],
  subtotal: '4950.00',
  discount: '250.00',
  customer_charges: '200.00',
  advance_paid: '1000.00',
  refunded_amount: '0.00',
}
