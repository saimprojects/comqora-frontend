import { useState } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { post } from '../../lib/api'
import { Button, Modal } from '../../components/ui'
import MessageEditor from './MessageEditor'

export default function ManualMessage({ order }) {
  const [body, setBody] = useState('')
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [requestId, setRequestId] = useState('')
  async function send(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await post('whatsapp/messages/', {
        order_id: order.id,
        request_id: requestId,
        body: new FormData(e.currentTarget).get('body'),
      })
      toast.success(result.detail)
      setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Button
        variant="primary"
        onClick={() => {
          setRequestId(crypto.randomUUID())
          setBody(
            `Hi ${order.customer_snapshot.name}, your order *${order.number}* is *${order.status.toLowerCase().replaceAll('_', ' ')}*.\nTracking: ${order.tracking_id || 'awaiting dispatch'}.`,
          )
          setError('')
          setOpen(true)
        }}
      >
        <Send size={16} />
        Send Auto Massage
      </Button>
      {open && (
        <Modal title="Send WhatsApp update" onClose={() => setOpen(false)}>
          <form onSubmit={send}>
            <p>
              To {order.customer_snapshot.name}. Removed or unsubscribed customers cannot receive
              messages. Sending limits apply; check Outbox after queueing.
            </p>
            <MessageEditor
              name="body"
              order
              value={body}
              onChange={setBody}
              variables={{
                store: order.workspace_name || 'Order update',
                customer: order.customer_snapshot.name,
                order_number: order.number,
                status: order.status.toLowerCase().replaceAll('_', ' '),
                tracking_id: order.tracking_id || 'awaiting dispatch',
                courier: order.courier_snapshot?.courier || '',
              }}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button loading={busy}>Confirm & queue message</Button>
          </form>
        </Modal>
      )}
    </>
  )
}
