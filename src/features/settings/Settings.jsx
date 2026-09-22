import Select from '../../components/Select'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  ShieldCheck,
  LockKeyhole,
  UserRound,
  Users,
  Check,
  LogOut,
  Plus,
  Monitor,
  TriangleAlert,
  Mail,
  Settings2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { api, patch, post } from '../../lib/api'
import { Badge, Button, Field, Modal, PageHeading, Loading } from '../../components/ui'
import { initials } from '../../lib/format'
import { useTheme } from '../../components/Theme'
import { Segmented } from '../../components/PricingControls'
import BrandSettings from '../printing/BrandSettings'
export default function Settings() {
  const [otpSent, setOtpSent] = useState(false)
  const [otpNotice, setOtpNotice] = useState('')
  const { theme, setTheme } = useTheme()
  const { user, refresh, signOut } = useAuth(),
    client = useQueryClient()
  const [tab, setTab] = useState('profile'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [invite, setInvite] = useState(false),
    [confirmSignOut, setConfirmSignOut] = useState(false)
  const team = useQuery({
    queryKey: ['team'],
    queryFn: () => api('team/'),
    enabled: user?.role === 'owner' && tab === 'team',
  })
  async function save(e, path, method = 'post') {
    e.preventDefault()
    setBusy(true)
    setError('')
    const form = e.currentTarget,
      data = Object.fromEntries(new FormData(form))
    try {
      if (path === 'auth/change-password/' && !otpSent) {
        const result = await post('auth/change-password/otp/', {
          current_password: data.current_password,
        })
        setOtpSent(true)
        setOtpNotice(result.detail)
        return
      }
      const response = await (method === 'patch' ? patch : post)(path, data)
      if (path === 'auth/me/') await refresh()
      toast.success(response.detail || 'Changes saved')
      if (path === 'team/') {
        setInvite(false)
        await client.invalidateQueries({ queryKey: ['team'] })
      }
      if (path === 'auth/change-password/') {
        form.reset()
        setOtpSent(false)
        setOtpNotice('Password updated successfully.')
      }
      if (path === 'workspace/') {
        await refresh()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  async function updateMember(member, updates) {
    try {
      await patch('team/', { id: member.id, ...updates })
      await client.invalidateQueries({ queryKey: ['team'] })
      toast.success('Team member updated')
    } catch (err) {
      toast.error(err.message)
    }
  }
  async function endSession() {
    setBusy(true)
    setError('')
    try {
      await signOut()
      setConfirmSignOut(false)
    } catch (err) {
      setError(err.message || 'We couldn’t sign you out. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="A workspace that works for you."
        description="Manage your account, your team, and the tools that keep things running."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Account settings">
          {[
            { id: 'profile', label: 'My profile', icon: UserRound },
            { id: 'security', label: 'Security', icon: LockKeyhole },
            { id: 'workspace', label: 'General & brand', icon: Settings2 },
            { id: 'print', label: 'Order print designs', icon: Settings2 },
            { id: 'appearance', label: 'Appearance', icon: Settings2 },
            ...(user?.role === 'owner'
              ? [{ id: 'team', label: 'Team & access', icon: Users }]
              : []),
            { id: 'session', label: 'Sign out & safety', icon: LogOut },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? 'selected' : ''}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => {
                setTab(id)
                setError('')
              }}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
          {user?.is_staff && (
            <a href="/admin/" target="_blank" rel="noreferrer">
              <ShieldCheck size={17} />
              Super admin
              <ArrowUpRight size={14} />
            </a>
          )}
        </nav>
        <div>
          {tab === 'session' && (
            <div className="account-safety">
              <section className="card settings-card">
                <div className="safety-heading">
                  <span className="safety-icon">
                    <Monitor size={23} />
                  </span>
                  <div>
                    <h2>Your current session</h2>
                    <p className="muted">Control access to your account on this browser.</p>
                  </div>
                </div>
                <dl className="session-details">
                  <div>
                    <dt>Signed in as</dt>
                    <dd>{user?.email}</dd>
                  </div>
                  <div>
                    <dt>Workspace</dt>
                    <dd>{user?.workspace_name || 'My workspace'}</dd>
                  </div>
                  <div>
                    <dt>Access level</dt>
                    <dd>
                      <Badge status={user?.role || 'staff'} />
                    </dd>
                  </div>
                </dl>
                <div className="safety-row">
                  <div>
                    <h3>Finished for now?</h3>
                    <p>
                      Sign out of this browser. Your saved orders, customers and workspace data stay
                      in place. Save any unfinished changes first.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setError('')
                      setConfirmSignOut(true)
                    }}
                  >
                    <LogOut size={16} /> Sign out
                  </Button>
                </div>
              </section>
              <section className="card settings-card danger-zone">
                <div className="safety-heading">
                  <span className="safety-icon">
                    <TriangleAlert size={23} />
                  </span>
                  <div>
                    <h2>Danger zone</h2>
                    <p className="muted">Sensitive changes deserve a second look.</p>
                  </div>
                </div>
                <div className="safety-row">
                  <div>
                    <h3>Concerned about account access?</h3>
                    <p>
                      Change your password to invalidate your other sessions. Signing out here only
                      ends this browser’s session.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setTab('security')
                      setError('')
                    }}
                  >
                    <LockKeyhole size={16} /> Change password
                  </Button>
                </div>
                <div className="safety-row">
                  <div>
                    <h3>Account or workspace closure</h3>
                    <p>
                      {user?.role === 'owner'
                        ? 'Contact support to request closure. Export the records you need first. Workspace closure can affect your entire team; no data is deleted from this screen.'
                        : 'Contact your workspace owner or support about removing your access. Workspace-wide changes must be handled by its owner.'}
                    </p>
                  </div>
                  <a
                    className="btn btn-secondary"
                    href="mailto:support@mostmailer.com?subject=Comqora%20account%20closure%20request"
                  >
                    <Mail size={16} /> Contact support
                  </a>
                </div>
              </section>
            </div>
          )}
          {tab === 'appearance' && (
            <section className="card settings-card">
              <h2>Make it yours.</h2>
              <p className="muted">
                Choose your workspace look. Saved on this browser and applied across every page.
              </p>
              <Segmented
                label="Color theme"
                value={theme}
                onChange={setTheme}
                options={[
                  ['light', 'Light'],
                  ['dark', 'Dark'],
                ]}
              />
              <div className={`theme-preview ${theme}`}>
                <strong>Comqora</strong>
                <span>Commerce, in control.</span>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </section>
          )}
          {tab === 'profile' && (
            <section className="card settings-card">
              <h2>Personal details</h2>
              <p className="muted">A familiar face for your team.</p>
              <div className="profile-preview">
                <span className="profile-avatar">{initials(user.first_name)}</span>
                <div>
                  <strong>
                    {user?.first_name} {user?.last_name}
                  </strong>
                  <p>{user?.email}</p>
                  <Badge status={user?.role || 'owner'} />
                </div>
              </div>
              <form onSubmit={(e) => save(e, 'auth/me/', 'patch')}>
                <div className="form-grid">
                  <Field label="First name">
                    <input name="first_name" required defaultValue={user?.first_name} />
                  </Field>
                  <Field label="Last name">
                    <input name="last_name" defaultValue={user?.last_name} />
                  </Field>
                  <Field label="Email address" hint="Email identifies your account.">
                    <input type="email" disabled value={user?.email} />
                  </Field>
                  <Field label="Email verification">
                    <span className="verification-status">
                      <ShieldCheck size={18} />
                      {user?.email_verified ? 'Verified' : 'Verification pending'}
                    </span>
                  </Field>
                </div>
                {error && <p className="form-error">{error}</p>}
                <div className="modal-actions">
                  {!user?.email_verified && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        post('auth/resend-verification/')
                          .then((r) => toast.success(r.detail))
                          .catch((e) => toast.error(e.message))
                      }
                    >
                      Resend verification
                    </Button>
                  )}
                  <Button loading={busy} type="submit">
                    <Check size={16} />
                    Save changes
                  </Button>
                </div>
              </form>
            </section>
          )}
          {tab === 'security' && (
            <section className="card settings-card">
              <h2>Keep your account secure.</h2>
              <p className="muted">A strong password is a good place to start.</p>
              <div className="info-banner">
                <ShieldCheck size={21} />
                <div>
                  <strong>Secure, server-managed sessions</strong>
                  <p>
                    Your session uses HttpOnly cookies and CSRF protection. Password changes
                    invalidate your other sessions.
                  </p>
                </div>
              </div>
              <form onSubmit={(e) => save(e, 'auth/change-password/')}>
                <p>
                  A verification code will be sent to your account email before your password
                  changes.
                </p>
                {otpNotice && <p role="status">{otpNotice}</p>}
                {otpSent && (
                  <>
                    <Field label="Email verification code">
                      <input
                        name="otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        placeholder="6-digit code"
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={async (e) => {
                        const form = e.currentTarget.form
                        setBusy(true)
                        setError('')
                        try {
                          const result = await post('auth/change-password/otp/', {
                            current_password: form.elements.current_password.value,
                          })
                          setOtpNotice(result.detail)
                        } catch (err) {
                          setError(err.message)
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      Resend code
                    </Button>
                  </>
                )}
                <Field label="Current password">
                  <input
                    name="current_password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <Field
                  label="New password"
                  hint="Use at least 10 characters. Avoid common passwords and personal information."
                >
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    required
                  />
                </Field>
                {error && <p className="form-error">{error}</p>}
                <div className="modal-actions">
                  <Button loading={busy} type="submit">
                    <LockKeyhole size={16} />
                    {otpSent ? 'Verify OTP and update password' : 'Send email OTP'}
                  </Button>
                </div>
              </form>
            </section>
          )}
          {tab === 'workspace' && <BrandSettings />}
          {tab === 'print' && <BrandSettings designs />}
          {tab === 'team' && (
            <section className="card">
              <div className="card-heading">
                <div>
                  <h2>Good work takes a team.</h2>
                  <p>Give each person the right level of access.</p>
                </div>
                <Button
                  onClick={() => {
                    setInvite(true)
                    setError('')
                  }}
                >
                  <Plus size={16} />
                  Add member
                </Button>
              </div>
              <div className="role-guide">
                <p>
                  <strong>Manager</strong> · Manage catalog, costs, orders, and reports.
                </p>
                <p>
                  <strong>Staff</strong> · Create customers and orders, dispatch, and receive
                  returns.
                </p>
                <p>
                  <strong>Viewer</strong> · Read-only access to business data and reports.
                </p>
              </div>
              {team.isPending ? (
                <Loading />
              ) : team.error ? (
                <p className="form-error">{team.error.message}</p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Team member</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {team.data?.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <strong>{m.first_name}</strong>
                            <small className="table-sub">{m.email}</small>
                          </td>
                          <td>
                            {m.role === 'owner' ? (
                              <Badge status="OWNER" />
                            ) : (
                              <Select
                                aria-label={`Role for ${m.first_name}`}
                                value={m.role}
                                onChange={(e) =>
                                  updateMember(m, { role: e.target.value, is_active: m.is_active })
                                }
                              >
                                <option value="manager">Manager</option>
                                <option value="staff">Staff</option>
                                <option value="viewer">Viewer</option>
                              </Select>
                            )}
                          </td>
                          <td>
                            <Badge status={m.is_active ? 'ACTIVE' : 'INACTIVE'} />
                          </td>
                          <td>
                            {m.role !== 'owner' && (
                              <Button
                                variant="secondary"
                                onClick={() => updateMember(m, { is_active: !m.is_active })}
                              >
                                {m.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      {confirmSignOut && (
        <Modal
          title="Sign out of Comqora?"
          description="You’ll need to sign in again to open your workspace on this browser."
          onClose={() => !busy && setConfirmSignOut(false)}
        >
          <p className="dialog-copy">
            Saved data will not be deleted. Any unsaved changes may be lost. Signing out does not
            pause your workspace’s background tracking or enabled messaging.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" disabled={busy} onClick={() => setConfirmSignOut(false)}>
              Stay signed in
            </Button>
            <Button variant="danger" loading={busy} onClick={endSession}>
              <LogOut size={16} /> Confirm sign out
            </Button>
          </div>
        </Modal>
      )}
      {invite && (
        <Modal
          title="Add a team member"
          description="Create their account with a temporary password. They can change it after signing in."
          onClose={() => !busy && setInvite(false)}
        >
          <form onSubmit={(e) => save(e, 'team/')}>
            <div className="form-grid">
              <Field label="Name">
                <input name="first_name" required />
              </Field>
              <Field label="Email">
                <input name="email" type="email" required />
              </Field>
              <Field label="Role">
                <Select name="role" defaultValue="staff">
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </Select>
              </Field>
              <Field label="Temporary password">
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  autoComplete="new-password"
                  required
                />
              </Field>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={() => setInvite(false)}>
                Cancel
              </Button>
              <Button loading={busy} type="submit">
                Create team account
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
