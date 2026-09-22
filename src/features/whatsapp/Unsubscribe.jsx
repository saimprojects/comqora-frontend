import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { post } from '../../lib/api'
import { Button } from '../../components/ui'

export default function Unsubscribe() {
  const [params] = useSearchParams()
  const [done, setDone] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  async function unsubscribe() {
    setBusy(true)
    setError('')
    try {
      await post('whatsapp/unsubscribe/', { token: params.get('token') })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="card settings-card" style={{ maxWidth: 560, margin: '60px auto' }}>
      <h1>WhatsApp preferences</h1>
      {done ? (
        <p>
          You are unsubscribed. Pending messages have been cancelled. A message already being sent
          cannot be recalled.
        </p>
      ) : (
        <>
          <p>Stop WhatsApp order updates and marketing from this store. No sign-in required.</p>
          <Button loading={busy} disabled={!params.get('token')} onClick={unsubscribe}>
            Confirm unsubscribe
          </Button>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
