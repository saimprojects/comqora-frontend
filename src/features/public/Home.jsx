import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  ArrowRight,
  Package,
  Truck,
  BarChart3,
  MessageCircle,
  Check,
  Layers,
  Plus,
  TrendingUp,
  CircleCheck,
  ShoppingBag,
  Command,
  ScanLine,
  ArrowDownRight,
} from 'lucide-react'
import { PageMeta } from './PublicLayout'

const features = [
  {
    icon: ShoppingBag,
    tag: '01 / ORDER OPERATIONS',
    title: 'Every order. One clear picture.',
    text: 'From customer details to packaging and dispatch, keep the work connected—not spread across a dozen tabs.',
    className: 'feature-orders',
  },
  {
    icon: Truck,
    tag: '02 / DELIVERY VISIBILITY',
    title: 'Know where things stand.',
    text: 'Supported courier tracking, a readable shipment timeline and manual updates when you need them.',
    className: 'feature-tracking',
  },
  {
    icon: Layers,
    tag: '03 / INVENTORY & COSTING',
    title: 'Stock with a story.',
    text: 'Track purchase batches, landed costs and FIFO allocation. See the cost behind what you sell.',
    className: 'feature-stock',
  },
  {
    icon: BarChart3,
    tag: '04 / PROFIT INTELLIGENCE',
    title: 'Revenue is only half the story.',
    text: 'Bring product costs, delivery charges, returns and expenses into a clearer view of your margins.',
    className: 'feature-profit',
  },
]

const previewModules = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'tracking', label: 'Tracking', icon: Truck },
  { id: 'inventory', label: 'Stock & costs', icon: Layers },
]

const previewScenarios = {
  orders: {
    eyebrow: 'ONE ORDER, EVERY DETAIL',
    title: 'Ready for the next step.',
    value: 'CQ–1048',
    caption: 'Ayesha · Lahore',
    icon: ShoppingBag,
    rows: [
      ['Everyday tote × 2', 'Rs 3,000'],
      ['Courier & packaging', 'Rs 260'],
      ['Product cost', 'Rs 1,600'],
    ],
    result: ['Estimated order profit', 'Rs 1,140'],
    note: 'Costs stay connected to the order, from stock allocation to dispatch.',
  },
  tracking: {
    eyebrow: 'FROM YOUR STORE TO THEIR DOOR',
    title: 'Every milestone, in view.',
    value: 'Out for delivery',
    caption: 'Order CQ–1048 · Sample shipment',
    icon: Truck,
    rows: [
      ['09:10 · Shipment picked up', 'Recorded'],
      ['18:45 · Arrived at destination', 'Recorded'],
      ['09:05 · Out for delivery', 'Latest event'],
    ],
    result: ['Customer update', 'Queued'],
    note: 'Supported courier updates feed your order timeline. Manual updates stay available.',
  },
  inventory: {
    eyebrow: 'KNOW WHAT EACH SALE COSTS',
    title: 'More than a stock count.',
    value: '48 pieces',
    caption: 'Everyday tote · Purchase batch 04',
    icon: Package,
    rows: [
      ['Purchase cost / piece', 'Rs 740'],
      ['Other costs / piece', 'Rs 60'],
      ['Landed cost / piece', 'Rs 800'],
    ],
    result: ['Stock allocation', 'FIFO'],
    note: 'Add batch costs once. The cost of each piece follows it into your orders.',
  },
}

function PreviewScenario({ view }) {
  const scenario = previewScenarios[view]
  const Icon = scenario.icon
  return (
    <div className="scenario-preview" aria-live="polite" aria-atomic="true">
      <div className="preview-heading">
        <div>
          <small>{scenario.eyebrow}</small>
          <h2>{scenario.title}</h2>
        </div>
      </div>
      <div className="scenario-identity">
        <span>
          <Icon size={24} />
        </span>
        <div>
          <strong>{scenario.value}</strong>
          <small>{scenario.caption}</small>
        </div>
        <ArrowUpRight size={20} />
      </div>
      <dl className={`scenario-rows ${view === 'tracking' ? 'scenario-timeline' : ''}`}>
        {scenario.rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="scenario-result">
        <span>{scenario.result[0]}</span>
        <strong>{scenario.result[1]}</strong>
      </div>
      <p className="scenario-note">{scenario.note}</p>
    </div>
  )
}

function ProductPreview() {
  const [active, setActive] = useState('overview')
  return (
    <div
      className="hero-product"
      aria-label="Illustrative Comqora workspace preview, sample data only"
    >
      <div className="preview-top">
        <span>
          <Command size={15} /> COMQORA WORKSPACE
        </span>
        <span className="preview-demo">Illustrative data</span>
      </div>
      <div className="preview-modules" role="group" aria-label="Explore the workspace preview">
        {previewModules.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={active === id}
            onClick={() => setActive(id)}
            aria-controls="workspace-preview-panel"
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      <div className="preview-body">
        <div className="preview-main" id="workspace-preview-panel">
          {active !== 'overview' ? (
            <PreviewScenario view={active} />
          ) : (
            <>
              <div className="preview-heading">
                <div>
                  <small>YOUR BUSINESS, AT A GLANCE</small>
                  <h2>A clearer kind of control.</h2>
                </div>
                <span>Last 30 days</span>
              </div>
              <div className="preview-stats">
                <div>
                  <small>Order value</small>
                  <strong>Rs 248,500</strong>
                  <span>One connected overview</span>
                </div>
                <div>
                  <small>Estimated profit</small>
                  <strong>Rs 48,200</strong>
                  <span>Costs included. Clarity gained.</span>
                </div>
                <div>
                  <small>Active shipments</small>
                  <strong>
                    38 <Truck size={19} />
                  </strong>
                  <span>Every next step in view</span>
                </div>
              </div>
              <div className="preview-graph">
                <div>
                  <strong>Your momentum</strong>
                  <span>
                    Revenue <i /> Profit <i />
                  </span>
                </div>
                <svg viewBox="0 0 600 130" aria-hidden="true">
                  <defs>
                    <linearGradient id="hero-area" x1="0" x2="0" y1="0" y2="1">
                      <stop stopColor="#6374ff" stopOpacity=".35" />
                      <stop offset="1" stopColor="#6374ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 30H600M0 70H600M0 110H600"
                    stroke="var(--line)"
                    strokeDasharray="4 6"
                  />
                  <path
                    d="M0 112C30 112 35 89 65 95S102 53 137 67 163 78 205 45 232 65 273 55 309 28 345 42 375 52 412 24 439 38 476 18 527 34 552 13 578 17 600 5V130H0Z"
                    fill="url(#hero-area)"
                  />
                  <path
                    d="M0 112C30 112 35 89 65 95S102 53 137 67 163 78 205 45 232 65 273 55 309 28 345 42 375 52 412 24 439 38 476 18 527 34 552 13 578 17 600 5"
                    stroke="#6374ff"
                    strokeWidth="3"
                    fill="none"
                  />
                  <path
                    d="M0 122Q80 111 110 118T220 94 330 101 420 80 510 89 600 64"
                    stroke="#cf8c36"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    fill="none"
                  />
                </svg>
                <div className="graph-dates">
                  <span>01 SEP</span>
                  <span>10 SEP</span>
                  <span>20 SEP</span>
                  <span>30 SEP</span>
                </div>
              </div>
              <div className="preview-order">
                <span className="mini-package">
                  <Package size={17} />
                </span>
                <div>
                  <strong>Order CQ–1048</strong>
                  <small>Ready for its next chapter</small>
                </div>
                <span className="preview-status">
                  <CircleCheck size={13} /> Delivered
                </span>
                <strong>Rs 2,450</strong>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <>
      <PageMeta
        title="Your commerce, beautifully connected"
        description="Meet Comqora: orders, inventory, courier tracking, WhatsApp and profit in one connected ecommerce workspace. Built for Pakistan's sellers."
      />
      <section className="home-hero home-hero-modern public-container">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span /> YOUR COMMERCE. CONNECTED. <ArrowUpRight size={13} />
          </div>
          <h1>
            Less busywork.
            <br />
            More <span>business.</span>
          </h1>
          <p className="hero-description">
            From the first order to the final margin. Bring your stock, deliveries, customers and
            profit into one connected operating core.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/register">
              Build your next chapter <ArrowUpRight size={17} />
            </Link>
            <a className="btn btn-secondary" href="#workspace-preview">
              Explore the workspace <ArrowRight size={16} />
            </a>
          </div>
          <div className="hero-checks">
            <span>
              <Check size={14} /> Built for Pakistan commerce
            </span>
            <span>
              <Check size={14} /> Your team. Your workspace.
            </span>
          </div>
          <div className="hero-built-for">
            <span>
              <ScanLine size={20} />
            </span>
            <p>
              <strong>Built around the way you sell.</strong>PKR, COD and Pakistan courier
              workflows.
            </p>
          </div>
        </div>
        <div className="preview-stage" id="workspace-preview">
          <div className="preview-stage-label">
            <span>
              <i /> YOUR NEXT COMMAND CENTRE
            </span>
            <span>
              TRY THE PREVIEW <ArrowDownRight size={14} />
            </span>
          </div>
          <ProductPreview />
          <div className="preview-caption">
            <TrendingUp size={16} />
            <p>Less switching tabs. More moving forward.</p>
            <span>COMMERCE + CORE</span>
          </div>
        </div>
      </section>
      <section
        className="operating-flow public-container"
        aria-label="Your connected order workflow"
      >
        <div className="operating-flow-title">
          <span className="section-kicker">THE COMQORA CONNECTION</span>
          <h2>
            One order.
            <br />
            Every detail connected.
          </h2>
        </div>
        <div className="operating-flow-steps">
          {[
            {
              icon: ShoppingBag,
              title: 'Capture the order',
              detail: 'Customer, products & payment',
            },
            { icon: Layers, title: 'Know the real cost', detail: 'Stock, packaging & courier' },
            { icon: Truck, title: 'Follow the delivery', detail: 'Timeline & customer updates' },
            { icon: BarChart3, title: 'See what you keep', detail: 'Returns, expenses & profit' },
          ].map(({ icon: Icon, title, detail }, index) => (
            <div key={title}>
              <span className="flow-node">
                <Icon size={19} />
                <small>0{index + 1}</small>
              </span>
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="courier-band">
        <div className="public-container">
          <p>ONE WORKSPACE, ACROSS YOUR DELIVERY OPERATIONS</p>
          <div>
            {['TCS', 'Leopards', 'M&P', 'Trax', 'PostEx', 'Daewoo', 'Dastaq', 'AHL'].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
          <small>
            Supported tracking services. Independent integrations, not partnership endorsements.
          </small>
        </div>
      </section>
      <section id="platform" className="public-section public-container">
        <div className="section-heading">
          <div>
            <span className="section-kicker">A CONNECTED WAY TO WORK</span>
            <h2>
              Big-picture clarity.
              <br />
              Small-detail control.
            </h2>
          </div>
          <p>
            Replace disconnected tasks with a calmer operating rhythm. Everything you need to
            see—and do—belongs together.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, ...feature }) => (
            <article key={feature.tag} className={`feature-card ${feature.className}`}>
              <div className="feature-icon">
                <Icon size={23} />
              </div>
              <span className="section-kicker">{feature.tag}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <FeatureDetail type={feature.className} />
            </article>
          ))}
        </div>
      </section>
      <section className="messaging-section">
        <div className="public-container messaging-grid">
          <div>
            <span className="section-kicker">A MORE PERSONAL CUSTOMER EXPERIENCE</span>
            <h2>
              Keep customers
              <br />
              in the conversation.
            </h2>
            <p>
              Send order updates, introduce new products and build thoughtful broadcasts from your
              business WhatsApp. Choose the audience, review the message, set the pace.
            </p>
            <Link to="/register" className="btn btn-primary">
              Bring your customers closer <ArrowUpRight size={16} />
            </Link>
            <small>
              Sending limits and recipient exclusions apply. Delivery depends on provider
              availability.
            </small>
          </div>
          <div className="message-art">
            <div className="message-art-title">
              <MessageCircle size={21} />
              <strong>Your brand. Your voice.</strong>
              <span>Preview</span>
            </div>
            <div className="chat-bubble">
              <strong>Your store ✦</strong>
              <p>Hi Ayesha, your order is on its way.</p>
              <div>
                <Package size={24} />
                <span>
                  Order CQ–1048
                  <br />
                  <small>Out for delivery</small>
                </span>
              </div>
              <p>A little something to look forward to.</p>
              <small>Illustrative message · 10:42</small>
            </div>
            <div className="message-flow">
              <span>Choose audience</span>
              <ArrowRight size={14} />
              <span>Review</span>
              <ArrowRight size={14} />
              <span>Schedule</span>
            </div>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="public-section public-container">
        <div className="section-heading">
          <div>
            <span className="section-kicker">FROM SETUP TO YOUR EVERYDAY</span>
            <h2>
              Make room for
              <br />
              what comes next.
            </h2>
          </div>
          <Link className="text-link" to="/contact">
            Need a walkthrough? <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="steps-grid">
          {[
            [
              '01',
              'Make it your workspace',
              'Create your business account and bring your team into a shared view.',
            ],
            [
              '02',
              'Connect the moving parts',
              'Add products, stock, customers and courier rates. Link your messaging account.',
            ],
            [
              '03',
              'Run with clarity',
              'Process orders, follow shipments and understand the costs behind every sale.',
            ],
          ].map(([num, title, body]) => (
            <article key={num}>
              <span>{num}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="public-container faq-section">
        <div>
          <span className="section-kicker">A FEW GOOD QUESTIONS</span>
          <h2>
            Before you
            <br />
            make your move.
          </h2>
          <p>Something else on your mind?</p>
          <Link to="/contact" className="text-link">
            Let’s talk <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          {[
            [
              'Who is Comqora built for?',
              'Sellers and small commerce teams who want their order operations, stock, courier tracking, marketing costs and profit in one workspace. The current workflows are tailored to Pakistan, PKR and cash-on-delivery operations.',
            ],
            [
              'Can my team use the same workspace?',
              'Yes. Workspace roles separate owner, manager, staff and viewer access. Business records stay scoped to the workspace.',
            ],
            [
              'Is courier tracking completely automatic?',
              'Supported couriers can be checked by the background tracking worker. Provider availability and credentials affect updates. Manual tracking updates remain available; unsupported couriers do not have automatic tracking.',
            ],
            [
              'Can I use it on my phone?',
              'The interface adapts to mobile and desktop. Data-heavy tables scroll within their cards, while navigation and forms adapt to smaller screens.',
            ],
            [
              'What does it cost?',
              'Choose Ultra for all non-AI features, or Ultra AI for every feature including AI. See Pricing for current monthly PKR prices. Pay by bank transfer and submit your screenshot; access starts after admin verification.',
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Plus size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="public-container">
        <div className="closing-cta">
          <span className="section-kicker">YOUR BUSINESS DESERVES A CLEARER CORE</span>
          <h2>
            Let’s build your
            <br />
            next chapter.
          </h2>
          <Link className="btn btn-primary" to="/register">
            Get started with Comqora <ArrowUpRight size={17} />
          </Link>
          <Link to="/blog">
            Or explore the journal <ArrowRight size={14} />
          </Link>
          <div className="cta-orbit" aria-hidden="true">
            c<span>q</span>
          </div>
        </div>
      </section>
    </>
  )
}

function FeatureDetail({ type }) {
  if (type === 'feature-orders')
    return (
      <div className="feature-mini">
        <span>
          <i /> Created
        </span>
        <ArrowRight size={14} />
        <span>
          <i /> Dispatched
        </span>
        <ArrowRight size={14} />
        <span>
          <Check size={13} /> Delivered
        </span>
      </div>
    )
  if (type === 'feature-tracking')
    return (
      <div className="tracking-mini">
        <span>
          <Check size={13} /> Picked up
        </span>
        <span>
          <Check size={13} /> In transit
        </span>
        <span>
          <Truck size={13} /> Out for delivery
        </span>
      </div>
    )
  if (type === 'feature-stock')
    return (
      <div className="stock-mini">
        <div>
          <Package size={24} />
          <span>
            Purchase batch<strong>Costs, accounted for.</strong>
          </span>
        </div>
        <span>
          FIFO
          <ArrowRight size={16} />
          Order
        </span>
      </div>
    )
  return (
    <div className="profit-mini">
      <span>
        Sale value <strong>−</strong> All costs
      </span>
      <ArrowRight size={18} />
      <strong>A clearer margin</strong>
    </div>
  )
}
