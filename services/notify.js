const TIMEOUT_MS = 5000

// Kastar aldrig vidare fel: en misslyckad notis får inte påverka huvudanropet.
export async function notifiera(titel, beskrivning, color = 0x00b0f4) {
  const url = process.env.DISCORD_WEBHOOK_URL

  if (!url) {
    console.warn('DISCORD_WEBHOOK_URL saknas — hoppar över notifiering')
    return
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: titel,
          description: beskrivning,
          color,
          timestamp: new Date().toISOString()
        }]
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })

    if (!response.ok) {
      console.error('Notifiering misslyckades: HTTP', response.status)
    }
  } catch (error) {
    console.error('Notifiering misslyckades:', error.message)
  }
}
