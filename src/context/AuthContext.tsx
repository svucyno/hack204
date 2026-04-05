import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiLogin, apiMe, apiRegister, type MeResponse } from '../lib/api'

type AuthContextValue = {
  token: string | null
  me: MeResponse['user'] | null
  profile: MeResponse['profile'] | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

const STORAGE = 'les_token'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE) : null,
  )
  const [me, setMe] = useState<MeResponse['user'] | null>(null)
  const [profile, setProfile] = useState<MeResponse['profile'] | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    if (!token) {
      setMe(null)
      setProfile(null)
      setLoading(false)
      return
    }
    try {
      const data = await apiMe(token)
      setMe(data.user)
      setProfile(data.profile)
    } catch {
      setToken(null)
      localStorage.removeItem(STORAGE)
      setMe(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  const login = useCallback(async (email: string, password: string) => {
    const { token: t, user } = await apiLogin(email, password)
    localStorage.setItem(STORAGE, t)
    setToken(t)
    setMe(user)
    setLoading(true)
    const data = await apiMe(t)
    setMe(data.user)
    setProfile(data.profile)
    setLoading(false)
  }, [])

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const { token: t, user } = await apiRegister(email, password, name)
      localStorage.setItem(STORAGE, t)
      setToken(t)
      setMe(user)
      setProfile(null)
      setLoading(false)
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE)
    setToken(null)
    setMe(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      token,
      me,
      profile,
      loading,
      login,
      register,
      logout,
      refreshMe,
    }),
    [token, me, profile, loading, login, register, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with provider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
