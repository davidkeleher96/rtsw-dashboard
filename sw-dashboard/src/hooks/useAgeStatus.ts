import { useState, useEffect } from 'react'

export function useAgeStatus(lastTS: string | null) {
  // parse YYYY-MM-DD hh:mm:ss.sss into a UTC timestamp
  const parseUtc = (ts: string) =>
    new Date(ts.replace(' ', 'T') + 'Z').getTime()

  const compute = (): 'LIVE' | 'PENDING' | 'OUT OF DATE' => {
    if (!lastTS) return 'OUT OF DATE'
    const age = Date.now() - parseUtc(lastTS)
    if (age < 5 * 60_000)   return 'LIVE'
    if (age < 6 * 60_000)   return 'PENDING'
    return                    'OUT OF DATE'
  }

  const [status, setStatus] = useState<'LIVE'|'PENDING'|'OUT OF DATE'>(compute)

  useEffect(() => {
    // recalc immediately on mount or whenever lastTS changes
    setStatus(compute())

    // then every 10 second
    const id = setInterval(() => {
      setStatus(compute())
    }, 10_000)

    return () => clearInterval(id)
  }, [lastTS])

  return status
}
