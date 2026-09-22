// Development-only visual fixtures. Does not fetch or mutate workspace records.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PrintPreview from '../src/features/printing/PrintPreview'
import {
  OrderDocument,
  ReportDocument,
  sampleOrder,
  templates,
} from '../src/features/printing/documents'
import '../src/styles.css'
import '../src/enhancements.css'
import '../src/comqora.css'
if (!import.meta.env.DEV) throw new Error('Development-only fixtures')
const brand = {
  id: 'qa',
  name: 'Studio Commerce',
  currency: 'PKR',
  business_address: '18 Main Boulevard, Gulberg III\nLahore, Pakistan',
  business_phone: '+92 300 1234567',
  business_email: 'hello@example.test',
  invoice_footer:
    'Thank you for choosing Studio Commerce.\nThoughtfully selected. Carefully delivered.',
  invoice_template: 'studio',
  has_logo: false,
}
const logo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="#334bd4"/><text x="32" y="41" text-anchor="middle" font-family="Arial" font-size="25" fill="white">SC</text></svg>')}`
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const rows = Array.from({ length: 55 }, (_, i) => ({
  id: String(i),
  name: `Customer ${i + 1} · Ayesha Khan`,
  phone: '03001234567',
  email: 'buyer@example.test',
  address: '24 Garden Avenue, Block B',
  city: 'Lahore',
  province: 'Punjab',
  order_count: 5,
  returned_count: 1,
}))
function QA() {
  const [template, setTemplate] = useState('studio'),
    [kind, setKind] = useState('order'),
    [modal, setModal] = useState(false)
  return (
    <>
      {!modal &&
        createPortal(
          <div className="print-portal">
            <div className="print-controls">
              <h2>Print QA · synthetic records</h2>
              <div className="print-toolbar">
                <select
                  aria-label="QA design"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="QA report"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="order">Order bill</option>
                  <option value="customers">55 customers</option>
                  <option value="long-order">40 order items</option>
                  <option value="bank">Bank statement</option>
                </select>
                <button className="btn btn-secondary" onClick={() => setModal(true)}>
                  Test preview controls
                </button>
                <button className="btn" onClick={() => window.print()}>
                  Print QA
                </button>
              </div>
            </div>
            <div className="print-stage">
              {kind === 'order' || kind === 'long-order' ? (
                <OrderDocument
                  brand={brand}
                  logo={logo}
                  order={
                    kind === 'long-order'
                      ? {
                          ...sampleOrder,
                          items: Array.from({ length: 40 }, (_, i) => ({
                            ...sampleOrder.items[0],
                            id: String(i),
                            name: `Item ${i + 1} — Everyday canvas tote with a longer product description`,
                            quantity: 1,
                            unit_price: '100.00',
                          })),
                          subtotal: '4000.00',
                        }
                      : sampleOrder
                  }
                  template={template}
                  sample
                />
              ) : kind === 'bank' ? (
                <ReportDocument
                  kind="bank"
                  brand={brand}
                  logo={logo}
                  generatedAt="2026-09-17"
                  statement={{
                    account: { name: 'Business current account', last_four: '4821' },
                    start_date: '2026-09-01',
                    end_date: '2026-09-17',
                    opening_balance: '125000.00',
                    money_in: '65420.00',
                    money_out: '4000.00',
                    closing_balance: '186420.00',
                    entries: [
                      {
                        id: '1',
                        date: '2026-09-05',
                        reference: 'SETTLEMENT-0926',
                        notes: 'Courier payment received',
                        amount: '65420.00',
                        balance: '190420.00',
                      },
                      {
                        id: '2',
                        date: '2026-09-06',
                        reference: 'PACKAGING-0926',
                        notes: 'Packaging supplier payment',
                        amount: '-4000.00',
                        balance: '186420.00',
                      },
                    ],
                  }}
                />
              ) : (
                <ReportDocument
                  kind="customers"
                  brand={brand}
                  logo={logo}
                  rows={rows}
                  generatedAt="2026-09-17"
                />
              )}
            </div>
          </div>,
          document.body,
        )}
      {modal && (
        <PrintPreview
          kind="order"
          sample
          brandOverride={brand}
          templateOverride={template}
          onClose={() => setModal(false)}
        />
      )}
    </>
  )
}
const root = createRoot(document.getElementById('root'))
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
root.render(
  <QueryClientProvider client={client}>
    <QA />
  </QueryClientProvider>,
)
