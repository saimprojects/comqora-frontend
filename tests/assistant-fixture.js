// Synthetic visual/test data only. Never contacts Fazita or a business backend.
export const managerConfig = {
  name: "Studio Commerce's Manager",
  ready: true,
  models: [{ id: 1, name: 'Preview model' }],
  notice:
    'Your Manager can read all workspace business data. Relevant records are sent to Fazita and its model providers. Changes require confirmation. This preview uses synthetic data only.',
  setup_message: 'Ask the platform administrator to configure Fazita in Jazzmin.',
}
export function managerFixture() {
  const conversations = []
  const turns = new Map()
  return {
    async api(path) {
      if (path === 'assistant/config/') return managerConfig
      if (path.split('?')[0] === 'assistant/conversations/')
        return {
          results: conversations.filter((c) => !c.archived),
          count: conversations.length,
          next_page: null,
        }
      const id = path.split('/')[2]
      return {
        id,
        title: conversations.find((c) => c.id === id)?.title,
        turns: turns.get(id) || [],
        older_page: null,
      }
    },
    async post(path, body = {}) {
      if (path === 'assistant/conversations/') {
        const conversation = {
          id: crypto.randomUUID(),
          title: 'New conversation',
          updated_at: new Date().toISOString(),
        }
        conversations.unshift(conversation)
        turns.set(conversation.id, [])
        return conversation
      }
      if (path.startsWith('assistant/actions/')) {
        const action = [...turns.values()]
          .flat()
          .flatMap((t) => t.actions)
          .find((a) => a.id === path.split('/')[2])
        action.status = body.decision === 'confirm' ? 'APPLIED' : 'CANCELLED'
        return action
      }
      const id = path.split('/')[2]
      const turn = {
        id: crypto.randomUUID(),
        question: body.question,
        status: 'COMPLETE',
        error: '',
        model_name: 'Preview model',
        created_at: new Date().toISOString(),
        answer:
          '## Your business, at a glance\nSynthetic preview — these are not real workspace totals.\n\n**Recorded cash: PKR 186,420.00**\nConfirmed courier receipts pending: PKR 42,900.00. This is your internal ledger, not a live bank balance.\n\n| Metric | Amount |\n| :--- | ---: |\n| Orders | 4 |\n| Placed order value | PKR 7,900.00 |\n| **Realized profit** | **PKR 712.90** |\n| Expected profit | PKR 1,043.50 |\n| Business expenses | PKR 55,000.00 |\n| **Net profit after expenses** | **−PKR 55,187.10** |\n\nInventory needs attention: Everyday canvas tote has 8 available units against a threshold of 10.\n\nI have prepared an example expense for review. Nothing has been saved.',
        sources: [
          { label: 'Cash ledger', url: '/bank' },
          { label: 'Everyday canvas tote', url: '/products' },
        ],
        steps: [
          { tool: 'business_overview', status: 'complete' },
          { tool: 'read_records', status: 'complete' },
        ],
        actions: [
          {
            id: crypto.randomUUID(),
            kind: 'create_expense',
            status: 'PENDING',
            payload: {
              name: 'Sample courier packaging',
              amount: '800.00',
              date: '2026-09-18',
              category: 'other',
            },
            result: { url: '/expenses', label: 'Sample courier packaging' },
          },
        ],
      }
      conversations.find((c) => c.id === id).title = body.question.slice(0, 100)
      turns.get(id).push(turn)
      return turn
    },
    async patch(path, body) {
      Object.assign(
        conversations.find((c) => c.id === path.split('/')[2]),
        body,
      )
      return body
    },
  }
}
