import { useCallback, useState } from 'react'

export function useLocalStorage(key: string, initial = ''): [string, (v: string) => void] {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(key) ?? initial } catch { return initial }
  })
  const set = useCallback((v: string) => {
    setValue(v)
    try { v ? localStorage.setItem(key, v) : localStorage.removeItem(key) } catch { /* ignore */ }
  }, [key])
  return [value, set]
}
