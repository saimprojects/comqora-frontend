import { createContext, useContext, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, DASHBOARD_LOCKED_EVENT, post } from '../../lib/api'
const Context = createContext(null)
export function AuthProvider({ children }) {
  const client = useQueryClient()
  const { data, isPending, refetch } = useQuery({
    queryKey: ['auth'],
    queryFn: () => api('auth/me/'),
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: 'always',
    refetchInterval: 60_000,
  })
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const refreshLockState = () => {
      void refetch()
    }
    window.addEventListener(DASHBOARD_LOCKED_EVENT, refreshLockState)
    return () => window.removeEventListener(DASHBOARD_LOCKED_EVENT, refreshLockState)
  }, [refetch])
  async function signOut() {
    await post('auth/logout/')
    client.clear()
    client.setQueryData(['auth'], null)
  }
  return (
    <Context.Provider value={{ user: data || null, loading: isPending, refresh: refetch, signOut }}>
      {children}
    </Context.Provider>
  )
}
export function useAuth() {
  const context = useContext(Context)
  if (!context) throw new Error('AuthProvider is required')
  return context
}
