import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CheckCircle, MessageSquare } from 'lucide-react'
import { Button, Field } from '../../components/ui'
import { post } from '../../lib/api'
import { PageMeta } from './PublicLayout'

export default function Contact() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [sent, setSent] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    data.privacy_acknowledged = data.privacy_acknowledged === 'on'
    try {
      await post('public/enquiries/', data)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="public-section public-container contact-page">
      <PageMeta title="Let’s talk commerce" />
      <div>
        <span className="section-kicker">GOOD CONVERSATIONS START HERE</span>
        <h1>
          Tell us about
          <br />
          your next chapter.
        </h1>
        <p>
          Exploring Comqora? Need a walkthrough?
          <br />
          Tell us how your business works—and what you want to make easier.
        </p>
        <p>
          <a className="text-link" href="mailto:support@mostmailer.com">
            support@mostmailer.com
          </a>
          <br />
          Kasur, Punjab, Pakistan
        </p>
        <div className="contact-note">
          <MessageSquare size={25} />
          <strong>A conversation, not a sales maze.</strong>
          <p>
            Your enquiry goes to the Comqora admin inbox. Please don’t include customer data,
            passwords or API tokens.
          </p>
        </div>
      </div>
      {sent ? (
        <div className="contact-form contact-success" role="status">
          <CheckCircle size={40} />
          <h2>You’re on our radar.</h2>
          <p>Your enquiry has been saved for the team to review.</p>
          <Link to="/" className="btn btn-secondary">
            Back to Comqora
          </Link>
        </div>
      ) : (
        <form className="contact-form" onSubmit={submit}>
          <h2>Let’s start with you.</h2>
          <Field label="Your name">
            <input name="name" autoComplete="name" maxLength="100" required />
          </Field>
          <Field label="Work email">
            <input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Business name (optional)">
            <input name="business" autoComplete="organization" maxLength="140" />
          </Field>
          <Field label="What would you like to discuss?">
            <textarea name="message" minLength="10" maxLength="3000" rows="5" required />
          </Field>
          <div className="honeypot" aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label className="privacy-check">
            <input type="checkbox" name="privacy_acknowledged" required />
            <span>
              I have read the <Link to="/privacy">privacy notice</Link> and understand this
              information will be used to respond to my enquiry.
            </span>
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button loading={busy}>
            Send enquiry <ArrowUpRight size={17} />
          </Button>
        </form>
      )}
    </section>
  )
}

export function NotFound() {
  return (
    <section className="public-section public-container public-empty">
      <PageMeta title="Page not found" noindex />
      <span className="section-kicker">404 / A LITTLE OFF TRACK</span>
      <h1>
        Let’s get you
        <br />
        back to your core.
      </h1>
      <p>This page isn’t here. Your next step is.</p>
      <Link to="/" className="btn btn-primary">
        Back to home
      </Link>
    </section>
  )
}
