export const MAX_TIMMAR = 4
export const MAX_AKTIVA = 3

// Ren funktion: inga databasanrop. `nu` skickas in så att den går att testa.
export function kontrolleraRegler(bokning, användarensBokningar, nu = Date.now()) {
  const timmar = (bokning.end - bokning.start) / 3600000

  if (timmar > MAX_TIMMAR) {
    return { ok: false, fel: `Max ${MAX_TIMMAR} timmar per bokning` }
  }

  if (bokning.start < nu) {
    return { ok: false, fel: 'Kan inte boka bakåt i tiden' }
  }

  if (användarensBokningar.length >= MAX_AKTIVA) {
    return { ok: false, fel: `Max ${MAX_AKTIVA} aktiva bokningar` }
  }

  return { ok: true }
}