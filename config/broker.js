const BASE = process.env.BROKER_API_URL
const headers = {
  'X-Booker-Group': process.env.BROKER_GROUP_TOKEN,
  'Content-Type': 'application/json',
}

export class BrokerError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function call(path, { method = 'GET', body, secret } = {}) {
  const url = `${BASE}${path}`
  console.log('Broker request:', method, url)

  let res

  try {
    res = await fetch(url, {
      method,
      headers: secret
        ? { ...headers, 'X-Booker-Allocation-Secret': secret }
        : headers,
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    throw new BrokerError(0, 'UNREACHABLE', err.message)
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    console.error('Broker response:', {
      url,
      status: res.status,
      body: data,
    })

    throw new BrokerError(res.status, data.code, data.error)
  }

  return data
}

export const broker = {
  inventory: (type) => call(`/${type}/inventory`),
  allocate: (type, body) => call(`/${type}/allocations`, { method: 'POST', body }),
  extend: (type, id, secret, endsAt) =>
    call(`/${type}/allocations/${id}/extend`, { method: 'POST', body: { endsAt }, secret }),
  withdraw: (type, id, secret) => call(`/${type}/allocations/${id}/withdraw`, { method: 'POST', secret }),
}
