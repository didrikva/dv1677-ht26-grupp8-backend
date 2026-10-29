export function ledigaTider(bokningar, dagStart, dagSlut) {
  const sorterade = [...bokningar].sort((a, b) => a.start - b.start)
  const luckor = []
  let markör = dagStart

  for (const b of sorterade) {
    if (b.start > markör) {
      luckor.push({ start: markör, end: b.start })
    }
    markör = b.end > markör ? b.end : markör
  }

  if (markör < dagSlut) {
    luckor.push({ start: markör, end: dagSlut })
  }

  return luckor
}