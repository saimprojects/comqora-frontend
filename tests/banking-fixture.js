// Synthetic visual-QA data only. Never used by the production application.
export const bankAccounts = [
  {
    id: 'bank-qa',
    name: 'Business current account',
    kind: 'BANK',
    last_four: '4821',
    balance: '186420.00',
    opening_balance: '125000.00',
    opening_date: '2026-09-01',
  },
]
export const bankStatement = {
  id: 'statement-qa',
  courier: 'courier-1',
  courier_name: 'Demo Courier',
  filename: 'demo-settlement.pdf',
  status: 'REVIEW',
  revision: 1,
  reference: '',
  date: null,
  net_amount: null,
  received_amount: '0.00',
  remaining_amount: null,
  page_count: 1,
  created_at: '2026-09-16T10:00:00Z',
  extracted: {
    pages: [
      {
        text: 'SYNTHETIC QA DOCUMENT\nSettlement DEMO-001\nCOD 30,000.00\nShipping 3,000.00\nMonthly fee (100.00)\nNet payable 26,900.00',
        width: 600,
        height: 700,
      },
    ],
    warnings: ['Review column meanings, row counts and totals against the original.'],
    summary_candidates: [
      { page: 1, text: 'Net payable 26,900.00' },
      { page: 1, text: 'Monthly service fee (100.00)' },
    ],
  },
  review: {
    reference: 'DEMO-001',
    date: '2026-09-15',
    currency: 'PKR',
    declared_net: '26900.00',
    declared_gross: '30000.00',
    tables: [
      {
        page: 1,
        columns: [
          { label: 'Consignment', role: 'tracking' },
          { label: 'COD Amount', role: 'gross' },
          { label: 'Shipping', role: 'fee' },
          { label: 'Net Amount', role: 'net' },
        ],
        rows: [
          {
            values: ['DEMO-CN001', '10000.00', '1000.00', '9000.00'],
            page: 1,
            external: false,
            bbox: [35, 220, 565, 265],
          },
          {
            values: ['DEMO-CN002', '20000.00', '2000.00', '18000.00'],
            page: 1,
            external: false,
            bbox: [35, 266, 565, 310],
          },
        ],
      },
    ],
    adjustments: [
      { label: 'Monthly service fee', amount: '-100.00', kind: 'expense', allocation: 'gross' },
    ],
    checks: [],
    update_costs: true,
    replace_costs: false,
    ownership_confirmed: true,
    source_confirmed: true,
    notes: 'Shared monthly fee allocated by settlement gross.',
  },
  validation: {
    valid: true,
    errors: [],
    warnings: [
      'Allocated amounts follow your selected rule; they are not courier-reported per-order fees.',
    ],
    gross: '30000.00',
    net: '26900.00',
    matched: 2,
    row_count: 2,
    rows: [
      {
        key: '1.1',
        tracking: 'DEMO-CN001',
        order_id: 'order-qa1',
        order_number: 'CQ-001',
        gross: '10000.00',
        net: '9000.00',
        cost: '1033.33',
        basis: 'ALLOCATED',
        previous_cost: null,
      },
      {
        key: '1.2',
        tracking: 'DEMO-CN002',
        order_id: 'order-qa2',
        order_number: 'CQ-002',
        gross: '20000.00',
        net: '18000.00',
        cost: '2066.67',
        basis: 'ALLOCATED',
        previous_cost: null,
      },
    ],
  },
}
export const bankEntries = [
  {
    id: 'entry-qa',
    account_name: 'Business current account',
    reference: 'DEMO-BANK-61420',
    statement_reference: 'DEMO-000',
    date: '2026-09-15',
    amount: '61420.00',
    reversed: false,
    reversal_of: null,
  },
]
export const bankSourceImage = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="0 0 600 700"><rect width="600" height="700" fill="white"/><g font-family="Arial" fill="#183044"><text x="35" y="48" font-size="12" fill="#77859a">SYNTHETIC QA DOCUMENT · NOT A REAL CPR</text><text x="35" y="90" font-size="28" font-weight="bold">Demo Courier</text><text x="35" y="120" font-size="15">Settlement statement</text><text x="35" y="155" font-size="12">Reference: DEMO-001 · Date: 15 September 2026</text><rect x="35" y="192" width="530" height="28" fill="#eaf0f6"/><g font-size="11"><text x="45" y="211">Consignment</text><text x="240" y="211">COD Amount</text><text x="365" y="211">Shipping</text><text x="475" y="211">Net Amount</text><text x="45" y="250">DEMO-CN001</text><text x="240" y="250">10,000.00</text><text x="365" y="250">1,000.00</text><text x="475" y="250">9,000.00</text><text x="45" y="293">DEMO-CN002</text><text x="240" y="293">20,000.00</text><text x="365" y="293">2,000.00</text><text x="475" y="293">18,000.00</text></g><path d="M35 270H565M35 312H565" stroke="#d5dee7"/><text x="300" y="355" font-size="13">Gross total: 30,000.00</text><text x="300" y="385" font-size="13">Shipping: (3,000.00)</text><text x="300" y="415" font-size="13">Monthly service fee: (100.00)</text><rect x="285" y="442" width="280" height="53" rx="6" fill="#edf1ff"/><text x="300" y="475" font-size="17" font-weight="bold">Net payable: 26,900.00</text><text x="35" y="635" font-size="10" fill="#77859a">Visual QA fixture. No real customer, bank or courier data.</text></g></svg>`
