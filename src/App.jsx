import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { defaultBaseUrl, sendSms } from './api/jasminClient'

const SETTINGS_KEY = 'smsConsoleSettings'

const parseRecipients = (value) =>
  value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

function App() {
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [from, setFrom] = useState('')
  const [recipientsInput, setRecipientsInput] = useState('')
  const [message, setMessage] = useState('')
  const [requestDlr, setRequestDlr] = useState(true)
  const [coding, setCoding] = useState('0')
  const [results, setResults] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      setBaseUrl(parsed.baseUrl || defaultBaseUrl)
      setUsername(parsed.username || '')
      setFrom(parsed.from || parsed.sender || '')
    } catch (err) {
      console.warn('Unable to restore saved settings')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ baseUrl, username, from }),
    )
  }, [baseUrl, username, from])

  const recipients = useMemo(
    () => parseRecipients(recipientsInput),
    [recipientsInput],
  )

  const handleSend = async () => {
    setError('')
    setNote('')

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required')
      return
    }
    if (!message.trim()) {
      setError('Message content is required')
      return
    }
    if (!recipients.length) {
      setError('Add at least one recipient')
      return
    }

    setSending(true)
    setResults(
      recipients.map((to) => ({ to, status: 'pending', details: '' })),
    )

    for (const to of recipients) {
      setResults((prev) =>
        prev.map((item) =>
          item.to === to ? { ...item, status: 'sending' } : item,
        ),
      )

      try {
        const response = await sendSms({
          baseUrl,
          username,
          password,
          from,
          to,
          content: message,
          dlr: requestDlr ? 1 : 0,
          coding,
        })

        setResults((prev) =>
          prev.map((item) =>
            item.to === to
              ? {
                  ...item,
                  status: 'sent',
                  details:
                    response.messageId ||
                    response.payload?.['message-id'] ||
                    response.raw,
                }
              : item,
          ),
        )
      } catch (err) {
        setResults((prev) =>
          prev.map((item) =>
            item.to === to
              ? { ...item, status: 'failed', details: err.message }
              : item,
          ),
        )
      }
    }

    setSending(false)
    setNote(
      `Attempted delivery to ${recipients.length} recipient${
        recipients.length > 1 ? 's' : ''
      }.`,
    )
  }

  const resetForm = () => {
    setRecipientsInput('')
    setMessage('')
    setResults([])
    setError('')
    setNote('')
  }

  const completedCount = results.filter((r) => r.status === 'sent').length
  const failedCount = results.filter((r) => r.status === 'failed').length

  return (
    <div className="app">
      <div className="hero">
        <h1>Vulero SMS Desk</h1>
        <div className="badges">
          <span className="pill">Local network</span>
          <span className="pill subtle">HTTP /send endpoint</span>
        </div>
      </div>

      <main className="layout">
        <section className="panel stretch">
          <div className="panel-head">
            <div>
              <p className="kicker">Gateway</p>
              <h2>Connection</h2>
            </div>
            <div className="inline-hint">
              <span className="dot" /> Runs on the Jasmin host
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Base URL</span>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:1401"
              />
              <small>Points to the Jasmin HTTP API (default :1401).</small>
            </label>
            <label className="field">
              <span>Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="jasmin user"
                autoComplete="username"
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
            <label className="field">
              <span>From (Sender ID)</span>
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="e.g. Vulero"
              />
              <small>Used as the <code>from</code> parameter when sending.</small>
            </label>
            <label className="field">
              <span>Encoding</span>
              <select
                value={coding}
                onChange={(e) => setCoding(e.target.value)}
              >
                <option value="0">GSM 03.38 (default)</option>
                <option value="1">ASCII</option>
                <option value="2">Latin-1</option>
                <option value="3">UCS2</option>
              </select>
            </label>
            <label className="field checkbox">
              <input
                type="checkbox"
                checked={requestDlr}
                onChange={(e) => setRequestDlr(e.target.checked)}
              />
              <div>
                <span>Request DLR</span>
                <small>Asks Jasmin to provide delivery reports if enabled.</small>
              </div>
            </label>
          </div>
        </section>

        <section className="panel stretch">
          <div className="panel-head">
            <div>
              <p className="kicker">Message</p>
              <h2>Single + Bulk</h2>
            </div>
            <div className="inline-hint">
              {recipients.length} recipient{recipients.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="content-grid">
            <label className="field">
              <span>Recipients</span>
              <textarea
                rows={4}
                value={recipientsInput}
                onChange={(e) => setRecipientsInput(e.target.value)}
                placeholder="+2547..., one per line or separated by commas"
              />
              <small>We send one request per recipient via Jasmin /send.</small>
            </label>
            <label className="field">
              <span>Message</span>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type the SMS content you want to deliver..."
              />
              <small>{message.length} characters</small>
            </label>
          </div>

          {error && <div className="banner error">{error}</div>}
          {note && <div className="banner note">{note}</div>}

          <div className="actions">
            <div className="action-buttons">
              <button
                className="primary"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Send via Jasmin'}
              </button>
              <button className="ghost" onClick={resetForm} disabled={sending}>
                Clear
              </button>
            </div>
            <div className="action-hint">
              Uses Jasmin HTTP API at <code>{baseUrl || 'http://localhost:1401'}/send</code>. No
              configuration is written; credentials live only in this session.
            </div>
          </div>
        </section>

        <section className="panel stretch">
          <div className="panel-head">
            <div>
              <p className="kicker">Status</p>
              <h2>Delivery trail</h2>
            </div>
            <div className="inline-hint">
              {completedCount ? `${completedCount} sent` : 'Waiting'}
              {failedCount ? ` · ${failedCount} failed` : ''}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="empty">
              <p>Nothing sent yet.</p>
              <p className="muted">
                Populate recipients and a message to send single or bulk SMS.
              </p>
            </div>
          ) : (
            <div className="result-grid">
              {results.map((item) => (
                <div className="result-card" key={item.to}>
                  <div className="result-top">
                    <span className="to">{item.to}</span>
                    <span className={`status ${item.status}`}>
                      {item.status === 'sent'
                        ? 'Sent'
                        : item.status === 'failed'
                        ? 'Failed'
                        : 'Sending'}
                    </span>
                  </div>
                  <p className="details">
                    {item.details || 'Awaiting response from Jasmin...'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
