import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGame } from '../../hooks/useGame'
import { QRScanner } from '../../components/QRScanner'
import { MapPin, Keyboard, Camera, ArrowRight, Users, User, Loader as Loader2, Shield } from 'lucide-react'

export function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getGameByCode } = useGame()

  const [step, setStep] = useState<'code' | 'name' | 'group'>('code')
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [game, setGame] = useState<{ id: string; title: string; room_code: string; mode: string } | null>(null)
  const [name, setName] = useState('')
  const [playMode, setPlayMode] = useState<'solo' | 'group'>('solo')
  const [groupName, setGroupName] = useState('')
  const [existingGroups, setExistingGroups] = useState<{ id: string; name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (code.length === 6) {
      handleCodeSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const handleCodeSubmit = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const g = await getGameByCode(code.toUpperCase())
      if (!g) {
        setError('Código no encontrado')
        setLoading(false)
        return
      }
      setGame({ id: g.id, title: g.title, room_code: g.room_code, mode: g.mode })
      setStep('name')
      setTimeout(() => nameInputRef.current?.focus(), 100)
    } catch {
      setError('Error buscando el juego')
    } finally {
      setLoading(false)
    }
  }

  const handleQRScan = (value: string) => {
    try {
      const url = new URL(value)
      const scannedCode = url.searchParams.get('code')
      if (scannedCode) {
        setCode(scannedCode)
        setShowScanner(false)
      } else {
        setError('QR inválido')
      }
    } catch {
      setError('QR inválido')
    }
  }

  const handleNameSubmit = async () => {
    if (!name.trim() || !game) return
    if (playMode === 'group') {
      setStep('group')
      try {
        const { data } = await (await import('../../lib/supabase')).supabase.from('groups').select('*').eq('game_id', game.id)
        if (data) setExistingGroups(data)
      } catch {
        // ignore
      }
    } else {
      joinAndNavigate()
    }
  }

  const joinAndNavigate = async () => {
    if (!game) return
    setLoading(true)
    try {
      const hookModule = await import('../../hooks/useGame')
      const hook = hookModule.useGame()
      let groupId: string | null = null
      if (playMode === 'group') {
        if (selectedGroupId) {
          groupId = selectedGroupId
        } else if (groupName.trim()) {
          const g = await hook.createGroup(game.id, groupName.trim())
          groupId = g.id
        }
      }
      const participant = await hook.joinGame(game.id, name.trim(), groupId ?? undefined)
      const session = {
        participantId: participant.id,
        gameId: game.id,
        name: participant.name,
        groupId: groupId ?? null,
        groupName: groupId ? (existingGroups.find((gr) => gr.id === groupId)?.name ?? groupName) : null,
        mode: playMode,
      }
      localStorage.setItem('mq_session', JSON.stringify(session))
      navigate(`/play/${game.room_code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al unirse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {step === 'code' && (
            <div className="animate-fade-in text-center space-y-6">
              <div className="w-16 h-16 bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <MapPin className="w-8 h-8 text-primary-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">MapQuest Game</h1>
                <p className="text-neutral-400 mt-1">Ingresa el código de la sala</p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                      placeholder="ABC123"
                      className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-center text-2xl font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCodeSubmit}
                  disabled={code.length !== 6 || loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  {loading ? 'Buscando...' : 'Entrar'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-700" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-neutral-900 px-2 text-neutral-500">o</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowScanner(!showScanner)}
                  className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  {showScanner ? 'Cerrar cámara' : 'Escanear QR'}
                </button>

                {showScanner && (
                  <div className="animate-fade-in">
                    <QRScanner onScan={handleQRScan} onError={(err) => setError(err)} />
                  </div>
                )}
              </div>

              {error && <p className="text-error-400 text-sm">{error}</p>}

              <div className="pt-4 border-t border-neutral-800">
                <button
                  onClick={() => navigate('/admin/login')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800/50 hover:bg-neutral-800 text-neutral-400 hover:text-white text-sm transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Soy organizador / Crear juego
                </button>
              </div>
            </div>
          )}

          {step === 'name' && game && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold">{game.title}</h2>
                <p className="text-neutral-400 text-sm mt-1">Código: {game.room_code}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Tu nombre</label>
                  <input
                    ref={nameInputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                    placeholder="Ej: Juan"
                    className="w-full px-4 py-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Modo de juego</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPlayMode('solo')}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-colors ${playMode === 'solo' ? 'border-primary-500 bg-primary-900/20' : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700'}`}
                    >
                      <User className="w-6 h-6" />
                      <span className="text-sm font-medium">Solo</span>
                    </button>
                    <button
                      onClick={() => setPlayMode('group')}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-colors ${playMode === 'group' ? 'border-primary-500 bg-primary-900/20' : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700'}`}
                    >
                      <Users className="w-6 h-6" />
                      <span className="text-sm font-medium">Grupo</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleNameSubmit}
                  disabled={!name.trim() || loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  Continuar
                </button>
              </div>

              <button onClick={() => setStep('code')} className="w-full text-center text-sm text-neutral-500 hover:text-neutral-300">
                Volver al código
              </button>
            </div>
          )}

          {step === 'group' && game && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold">{game.title}</h2>
                <p className="text-neutral-400 text-sm mt-1">Elige o crea un grupo</p>
              </div>

              <div className="space-y-4">
                {existingGroups.length > 0 && (
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Grupos existentes</label>
                    <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                      {existingGroups.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => setSelectedGroupId(g.id)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl border transition-colors ${selectedGroupId === g.id ? 'border-primary-500 bg-primary-900/20' : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700'}`}
                        >
                          <span className="text-sm font-medium">{g.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-700" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-neutral-900 px-2 text-neutral-500">o crea uno nuevo</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Nombre del grupo</label>
                  <input
                    value={groupName}
                    onChange={(e) => { setGroupName(e.target.value); setSelectedGroupId(null) }}
                    placeholder="Ej: Los Exploradores"
                    className="w-full px-4 py-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <button
                  onClick={joinAndNavigate}
                  disabled={(!selectedGroupId && !groupName.trim()) || loading}
                  className="w-full flex items-center justify-center gap-2 bg-success-600 hover:bg-success-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  Unirse al juego
                </button>
              </div>

              <button onClick={() => setStep('name')} className="w-full text-center text-sm text-neutral-500 hover:text-neutral-300">
                Volver
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
