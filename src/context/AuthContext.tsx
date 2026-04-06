import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { apiLogin, apiMe, apiRegister, type MeResponse } from '../lib/api'

type AuthContextValue = {
  token: string | null
  me: MeResponse['user'] | null
  profile: MeResponse['profile'] | null
  learningState: any | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

const STORAGE = 'les_token'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  
  const [token, setToken] = useState<string | null>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE) : null,
  )
  const [me, setMe] = useState<MeResponse['user'] | null>(null)
  const [profile, setProfile] = useState<MeResponse['profile'] | null>(null)
  const [learningState, setLearningState] = useState<any | null>(null)
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
      setLearningState(data.learningState)
    } catch {
      setToken(null)
      localStorage.removeItem(STORAGE)
      setMe(null)
      setProfile(null)
      setLearningState(null)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }, [token, navigate])

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
    setLearningState(data.learningState)
    setLoading(false)
  }, [])

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const { token: t, user } = await apiRegister(email, password, name)
      localStorage.setItem(STORAGE, t)
      setToken(t)
      setMe(user)
      setProfile(null)
      setLearningState(null)
      setLoading(false)
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE)
    setToken(null)
    setMe(null)
    setProfile(null)
    setLearningState(null)
    navigate('/login')
  }, [navigate])

  const value = useMemo(
    () => ({
      token,
      me,
      profile,
      learningState,
      loading,
      login,
      register,
      logout,
      refreshMe,
    }),
    [token, me, profile, learningState, loading, login, register, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with provider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
