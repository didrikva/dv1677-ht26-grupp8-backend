import { vi, test, expect } from 'vitest'
import { broker, BrokerError } from '../config/broker.js'

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