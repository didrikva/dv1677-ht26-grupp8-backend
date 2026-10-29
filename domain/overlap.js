// Strikt mindre än: en bokning som slutar 10:00 krockar inte med en som börjar 10:00.
export function overlappar(a, b) {
  return a.start < b.end && b.start < a.end
}
