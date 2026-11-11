import { afterEach, beforeEach, vi, test, expect, describe, it } from 'vitest'
import { broker, BrokerError } from '../config/broker.js'

let realBroker
let fetchMock

test('en nekad bokning ger 409', async () => {
  vi.spyOn(broker, 'allocate').mockRejectedValue(
    new BrokerError(409, 'CAPACITY_EXCEEDED', 'full'),
  )
  // ... skicka POST /api/bookings med supertest och kontrollera:
  //   statusen blir 409, och ingen bokning har sparats i databasen
})

test('brokern nere ger 503', async () => {
  vi.spyOn(broker, 'allocate').mockRejectedValue(new BrokerError(0, 'UNREACHABLE', 'timeout'))
  // ... förvänta 503 och att ingen bokning sparats
})

beforeEach(async () => {
  vi.stubEnv('BROKER_API_URL', 'https://broker.test')
  vi.stubEnv('BROKER_GROUP_TOKEN', 'group-token')
  vi.resetModules()

  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  const brokerModule = await import('../config/broker.js')
  realBroker = brokerModule.broker
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('broker HTTP client', () => {
  it('fetches inventory with the group headers', async () => {
    const inventory = [{ id: 'resource-1' }]
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(inventory)
    })

    await expect(realBroker.inventory('maas')).resolves.toEqual(inventory)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://broker.test/maas/inventory',
      expect.objectContaining({
        method: 'GET',
        body: undefined,
        headers: {
          'X-Booker-Group': 'group-token',
          'Content-Type': 'application/json'
        },
        signal: expect.any(AbortSignal)
      })
    )
  })

  it('sends allocation and extension payloads as JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ allocation: { id: 'alloc-1' } })
    })

    const allocationBody = { user: 'user-1', want: { vcpus: 2 } }
    await realBroker.allocate('proxmox', allocationBody)
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://broker.test/proxmox/allocations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(allocationBody)
      })
    )

    await realBroker.extend('proxmox', 'alloc-1', 'allocation-secret', '2030-01-01T12:00:00Z')
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://broker.test/proxmox/allocations/alloc-1/extend',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'X-Booker-Group': 'group-token',
          'Content-Type': 'application/json',
          'X-Booker-Allocation-Secret': 'allocation-secret'
        },
        body: JSON.stringify({ endsAt: '2030-01-01T12:00:00Z' })
      })
    )
  })

  it('withdraws an allocation with its allocation secret', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ withdrawn: true })
    })

    await expect(
      realBroker.withdraw('openstack', 'alloc-2', 'secret-2')
    ).resolves.toEqual({ withdrawn: true })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://broker.test/openstack/allocations/alloc-2/withdraw',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'X-Booker-Group': 'group-token',
          'Content-Type': 'application/json',
          'X-Booker-Allocation-Secret': 'secret-2'
        },
        body: undefined
      })
    )
  })

  it('returns an empty object when a successful response has invalid JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new Error('invalid JSON'))
    })

    await expect(realBroker.inventory('maas')).resolves.toEqual({})
  })

  it('wraps network errors as an unreachable BrokerError', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    await expect(realBroker.inventory('maas')).rejects.toMatchObject({
      status: 0,
      code: 'UNREACHABLE',
      message: 'network down'
    })
  })
})