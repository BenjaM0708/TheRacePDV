import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LogIn, UserPlus, Loader as Loader2 } from 'lucide-react'

export function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password)
        setError('Cuenta creada. Ahora inicia sesión.')
        setIsSignUp(false)
      } else {
        await signIn(email, password)
        navigate('/admin')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-800 rounded-2xl p-6 shadow-xl animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">MapQuest Game</h1>
          <p className="text-neutral-400 mt-1">Panel de Administración</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-neutral-700 border border-neutral-600 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="admin@mapquest.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-neutral-700 border border-neutral-600 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className={`text-sm px-3 py-2 rounded-lg ${error.includes('creada') ? 'bg-success-900/30 text-success-400' : 'bg-error-900/30 text-error-400'}`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError('') }}
          className="w-full mt-4 text-sm text-primary-400 hover:text-primary-300"
        >
          {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  )
}
