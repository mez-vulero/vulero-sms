const DEFAULT_BASE_URL = import.meta.env.VITE_JASMIN_BASE_URL || 'http://localhost:1401'

const normalizeBaseUrl = (value) => (value || DEFAULT_BASE_URL).replace(/\/+$/, '')

const tryParseJson = (text) => {
  try {
    return JSON.parse(text)
  } catch (err) {
    return null
  }
}

export async function sendSms({
  baseUrl,
  username,
  password,
  from,
  to,
  content,
  dlr = 1,
  coding = 0,
}) {
  if (!username || !password) {
    throw new Error('Username and password are required')
  }

  const params = new URLSearchParams()
  params.append('username', username)
  params.append('password', password)
  params.append('to', to)
  params.append('content', content)
  params.append('dlr', String(dlr))
  params.append('coding', String(coding))
  if (from) params.append('from', from)

  const url = `${normalizeBaseUrl(baseUrl)}/send`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const raw = await response.text()
  const parsed = tryParseJson(raw)

  const statusCode = parsed?.status ?? parsed?.code
  const isErrorStatus = typeof statusCode === 'number' && statusCode !== 0

  if (!response.ok || isErrorStatus) {
    const message =
      parsed?.reason ||
      parsed?.error ||
      parsed?.description ||
      parsed?.message ||
      raw ||
      'Jasmin returned an error'
    throw new Error(message)
  }

  return {
    raw,
    payload: parsed,
    messageId: parsed?.['message_id'] || parsed?.['message-id'],
  }
}

export const defaultBaseUrl = DEFAULT_BASE_URL
