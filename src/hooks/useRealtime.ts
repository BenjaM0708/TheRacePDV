import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(
  table: string,
  filter: string | null,
  onChange: (payload: unknown) => void
) {
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes-${Math.random()}`)
      .on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table, filter: filter ?? undefined },
        (payload) => {
          callbackRef.current(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter])
}
