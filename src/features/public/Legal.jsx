import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { PageMeta } from './PublicLayout'

export const legalPages = {
  privacy: {
    title: 'Privacy notice',
    intro: 'A clear view of the data behind your workspace.',
    sections: [
      [
        'Data we handle',
        'Account and workspace details, customer contact information, order and inventory records, courier tracking details, message content and communication preferences are processed to operate the platform. Contact-form submissions include the information you choose to send.',
      ],
      [
        'How data is used',
        'Information is used to authenticate accounts, maintain business records, calculate reports, perform configured tracking and messaging, respond to enquiries and investigate service issues. Sellers must have an appropriate basis for the customer information they upload and the communications they send.',
      ],
      [
        'Services involved',
        'Configured hosting, database and email providers process information needed to operate the service. Courier providers receive shipment identifiers for tracking. The configured WhatsApp service processes recipient numbers, message content and delivery events. Cloudinary stores uploaded media; promotional media URLs may be publicly accessible. Do not upload private documents as campaign media.',
      ],
      [
        'Storage and retention',
        'Workspace data, audit logs, message history and uploaded files may persist until an authorized deletion process is completed. Backups can retain older copies. The operator must document retention periods, hosting locations and subprocessors before public launch; no automatic retention or deletion timetable is promised here.',
      ],
      [
        'Your choices and requests',
        'Account settings control communication features. Customer exclusions and supported STOP messages prevent further automated messaging. Contact the operator about access, correction, export or deletion; identity and authorization may need to be verified. Removing a WhatsApp recipient does not delete their order records.',
      ],
      [
        'Browser technologies and updates',
        'Essential session/CSRF cookies support login and request protection; local storage remembers appearance. See the cookie policy. This notice must be updated when actual data practices change. Legal rights vary with the applicable jurisdiction.',
      ],
    ],
  },
  terms: {
    title: 'Terms of service',
    intro: 'The working agreement for a shared commerce workspace.',
    sections: [
      [
        'Using Comqora',
        'Comqora provides software for business operations. You are responsible for accurate account details, authorized team access, secure credentials and the business data entered into the platform. Do not share access with unauthorized people.',
      ],
      [
        'Your business responsibilities',
        'You remain responsible for your products, customers, fulfilment, taxes, accounting decisions and customer communications. Estimates and reports depend on your inputs and recorded events; they do not replace professional accounting or legal advice.',
      ],
      [
        'Third-party dependencies',
        'Tracking, email, media and messaging depend on configured external services. A queued message is not proof of delivery, and a courier checkpoint is not a guarantee of fulfilment. External terms and usage restrictions continue to apply.',
      ],
      [
        'Permitted content and ownership',
        'You retain your rights in content you provide and authorize its processing to deliver configured features. Only upload content you are entitled to use. Do not misuse the service, evade restrictions, send abusive communications or access another workspace.',
      ],
      [
        'Commercial terms and ending use',
        'Prices and monthly access terms are shown at checkout. Payment approval starts access; same-plan renewals extend active access by one calendar month. Changing plans replaces the remaining period with a new month on approval, without automatic prorating. Contact the operator before closing a workspace so data-handling requirements can be reviewed.',
      ],
      [
        'Operator-specific terms awaiting review',
        'The contracting entity, governing law, dispute process and any liability provisions must be finalized by the operator with qualified counsel. This draft does not invent a jurisdiction or override mandatory rights.',
      ],
    ],
  },
  cookies: {
    title: 'Cookie policy',
    intro: 'Small browser settings. A straightforward explanation.',
    sections: [
      [
        'Essential cookies',
        'Session cookies identify a signed-in account. CSRF cookies help protect state-changing requests. These are needed for authenticated features, not for advertising. Blocking them may prevent login or form submissions.',
      ],
      [
        'Local storage',
        'The appearance preference is stored on your device. Existing installations may retain the legacy sellflow-theme key; new preferences use comqora-theme. These preferences do not identify customers or grant access to a workspace.',
      ],
      [
        'External requests',
        'Fonts may be requested from Google Fonts and media from configured Cloudinary URLs. Those providers receive normal request metadata. This notice does not claim those requests are anonymous.',
      ],
      [
        'Managing settings',
        'You can clear cookies and local storage in your browser. Clearing session cookies signs you out. No advertising pixels or marketing analytics were added with this public site; if the operator later adds non-essential tracking, update this policy and provide any required consent controls before activation.',
      ],
    ],
  },
  'acceptable-use': {
    title: 'Acceptable use',
    intro: 'Good operations start with respect for people and their data.',
    sections: [
      [
        'Communicate responsibly',
        'Only contact people when you have the necessary permission or other appropriate basis. Default platform eligibility is not evidence of customer agreement. Respect opt-outs, sending limits and provider restrictions.',
      ],
      [
        'Protect the workspace',
        'Do not attempt unauthorized access, harvest credentials, expose personal data, introduce malware or interfere with other workspaces. Team permissions must reflect genuine job responsibilities.',
      ],
      [
        'Use content you can share',
        'Do not upload illegal, infringing or deceptive content. Promotional files should be appropriate for public sharing. Do not use broadcasts for harassment, fraud or unsolicited abusive campaigns.',
      ],
      [
        'Report misuse',
        'Use the contact page to report misuse or security concerns without sending passwords, API tokens or unredacted customer records. The operator will need enough information to identify and investigate the report.',
      ],
    ],
  },
  refunds: {
    title: 'Billing & refunds',
    intro: 'Know the commercial terms before committing.',
    sections: [
      [
        'Manual monthly subscriptions',
        'Current plan prices are shown on the Pricing page in PKR per workspace per calendar month. Payments are manually verified before access begins. Renewals are not automatic. Contact Comqora with your payment reference for refund requests; no automatic refund is promised.',
      ],
      [
        'If you have paid',
        'Use the contact form with your account email and a non-sensitive transaction reference. Do not send payment-card details. Eligibility for a refund depends on the written agreement and applicable mandatory consumer rights; this draft does not create a blanket no-refund rule.',
      ],
      [
        'Your customers’ orders',
        'Refunds for products sold by a merchant are the merchant’s responsibility. Recording a refund inside Comqora is a business-record update, not a transfer of money to the customer.',
      ],
    ],
  },
  security: {
    title: 'Security & data',
    intro: 'Practical safeguards, without empty promises.',
    sections: [
      [
        'Workspace access',
        'Authenticated workflows and workspace-scoped permissions protect business operations. Owner, manager, staff and viewer roles have different capabilities. Use unique credentials and restrict administrative access.',
      ],
      [
        'Integration credentials',
        'Courier and messaging credentials are configured server-side. Never place API keys in public files or campaign content. HTTPS, secure deployment settings, backup controls and key rotation remain the operator’s responsibility.',
      ],
      [
        'Messaging safety',
        'Messages use a durable database queue with sending limits and duplicate controls. Signed events can update delivery acknowledgements. Unknown outcomes are not blindly retried. No software can guarantee every external delivery or uninterrupted service.',
      ],
      [
        'Report a concern',
        'Contact the operator with a concise description and reproduction steps. Do not exploit a suspected issue or disclose private data. No certification, independent penetration-test result or 24/7 security-response SLA is claimed here.',
      ],
    ],
  },
}

export default function Legal({ page }) {
  const params = useParams()
  const key = page || params.page
  const doc = legalPages[key]
  const config = useQuery({ queryKey: ['public-config'], queryFn: () => api('public/config/') })
  if (!doc) return null
  return (
    <section className="public-section public-container legal-page">
      <PageMeta title={doc.title} />
      <div className="legal-heading">
        <span className="section-kicker">COMQORA / TRUST CENTRE</span>
        <h1>{doc.title}</h1>
        <p>{doc.intro}</p>
      </div>
      <div className="legal-grid">
        <nav aria-label="Legal pages">
          {Object.entries(legalPages).map(([slug, item]) => (
            <Link key={slug} to={`/${slug}`} className={slug === key ? 'selected' : ''}>
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="article-prose">
          {!config.data?.legal_reviewed && (
            <div className="legal-draft">
              <strong>Draft for operator review</strong>
              <p>
                These pages describe the current product but are not finalized legal advice.
                Operator details, retention terms and applicable legal requirements must be reviewed
                before public launch.
              </p>
            </div>
          )}
          <p>
            <strong>Operator:</strong>{' '}
            {config.data?.business_name || '[Registered business name to be supplied]'}
            <br />
            <strong>Address:</strong>{' '}
            {config.data?.business_address || '[Business address to be supplied]'}
            <br />
            <strong>Contact:</strong> {config.data?.support_email || 'Use the contact form'} ·{' '}
            <Link to="/contact">Contact Comqora</Link>
          </p>
          {doc.sections.map(([title, body]) => (
            <section key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
            </section>
          ))}
        </div>
      </div>
    </section>
  )
}
