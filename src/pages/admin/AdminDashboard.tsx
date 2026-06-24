import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useGame } from '../../hooks/useGame'
import { useRealtime } from '../../hooks/useRealtime'
import { supabase } from '../../lib/supabase'
import type { Game, Station } from '../../types'
import { Plus, Play, Pause, Square, Trophy, MapPin, Clock, Users, Trash2, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export function AdminDashboard() {
  const { user, signOut, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { getGameById, updateGameStatus, deleteStation, getParticipants, getCompletions } = useGame()
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [participants, setParticipants] = useState<{ id: string; name: string; group?: { name: string } }[]>([])
  const [completions, setCompletions] = useState<{ station_id: string; completed_at: string; participant?: { name: string }; group?: { name: string } }[]>([])
  const [showQR, setShowQR] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login')
    }
  }, [user, authLoading, navigate])

  const fetchGames = async () => {
    if (!user) return
    const { data, error } = await supabase.from('games').select('*').eq('admin_id', user.id).order('created_at', { ascending: false })
    if (!error && data) setGames(data as Game[])
  }

  useEffect(() => {
    fetchGames()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useRealtime('games', null, () => {
    fetchGames()
    if (selectedGame) refreshSelectedGame(selectedGame.id)
  })

  const refreshSelectedGame = async (gameId: string) => {
    try {
      const game = await getGameById(gameId)
      setSelectedGame(game)
      setStations(game.stations)
    } catch {
      // ignore
    }
  }

  const selectGame = async (game: Game) => {
    try {
      const full = await getGameById(game.id)
      setSelectedGame(full)
      setStations(full.stations)
      const [p, c] = await Promise.all([getParticipants(game.id), getCompletions(game.id)])
      setParticipants(p)
      setCompletions(c)
    } finally {
      // done
    }
  }

  const handleStatusChange = async (status: Game['status']) => {
    if (!selectedGame) return
    await updateGameStatus(selectedGame.id, status)
    setSelectedGame({ ...selectedGame, status })
    fetchGames()
  }

  const handleDeleteStation = async (id: string) => {
    if (!confirm('¿Eliminar esta estación?')) return
    await deleteStation(id)
    if (selectedGame) refreshSelectedGame(selectedGame.id)
  }

  const getTimeRemaining = () => {
    if (!selectedGame?.time_limit_minutes || !selectedGame.started_at) return null
    const end = new Date(new Date(selectedGame.started_at).getTime() + selectedGame.time_limit_minutes * 60000)
    const diff = end.getTime() - Date.now()
    if (diff <= 0) return '00:00'
    const m = Math.floor(diff / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const getLeaderboard = () => {
    const standings: Record<string, { name: string; completed: number; lastAt: number }> = {}
    for (const c of completions) {
      const key = c.group?.name ?? c.participant?.name ?? 'Unknown'
      if (!standings[key]) standings[key] = { name: key, completed: 0, lastAt: 0 }
      standings[key].completed += 1
      const t = new Date(c.completed_at).getTime()
      if (t > standings[key].lastAt) standings[key].lastAt = t
    }
    return Object.values(standings).sort((a, b) => b.completed - a.completed || a.lastAt - b.lastAt)
  }

  if (authLoading) {
    return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Cargando...</div>
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <header className="border-b border-neutral-700 bg-neutral-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">MapQuest Admin</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-400 hidden sm:inline">{user.email}</span>
            <button onClick={() => signOut()} className="text-sm text-neutral-400 hover:text-white">Salir</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mis Juegos</h2>
              <button onClick={() => navigate('/admin/create')} className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Nuevo
              </button>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
              {games.map((g) => (
                <button
                  key={g.id}
                  onClick={() => selectGame(g)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${selectedGame?.id === g.id ? 'border-primary-500 bg-primary-900/20' : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700'}`}
                >
                  <div className="font-medium">{g.title}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                    <span className="bg-neutral-700 px-1.5 py-0.5 rounded">{g.room_code}</span>
                    <span className="capitalize">{g.mode}</span>
                    <span className={`px-1.5 py-0.5 rounded ${g.status === 'active' ? 'bg-success-900/40 text-success-400' : g.status === 'ended' ? 'bg-neutral-700' : 'bg-warning-900/40 text-warning-400'}`}>{g.status}</span>
                  </div>
                </button>
              ))}
              {games.length === 0 && <p className="text-neutral-500 text-sm">No hay juegos aún.</p>}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedGame ? (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-neutral-800 rounded-2xl p-5 border border-neutral-700">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">{selectedGame.title}</h2>
                      <div className="flex items-center gap-3 mt-1 text-sm text-neutral-400">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedGame.room_code}</span>
                        <span className="capitalize">{selectedGame.mode}</span>
                        {selectedGame.time_limit_minutes && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedGame.time_limit_minutes} min</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedGame.status === 'lobby' && (
                        <button onClick={() => handleStatusChange('active')} className="flex items-center gap-1 bg-success-600 hover:bg-success-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                          <Play className="w-4 h-4" /> Iniciar
                        </button>
                      )}
                      {selectedGame.status === 'active' && (
                        <>
                          <button onClick={() => handleStatusChange('paused')} className="flex items-center gap-1 bg-warning-600 hover:bg-warning-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                            <Pause className="w-4 h-4" /> Pausar
                          </button>
                          <button onClick={() => handleStatusChange('ended')} className="flex items-center gap-1 bg-error-600 hover:bg-error-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                            <Square className="w-4 h-4" /> Terminar
                          </button>
                        </>
                      )}
                      {selectedGame.status === 'paused' && (
                        <button onClick={() => handleStatusChange('active')} className="flex items-center gap-1 bg-success-600 hover:bg-success-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                          <Play className="w-4 h-4" /> Reanudar
                        </button>
                      )}
                      <button onClick={() => setShowQR(showQR === selectedGame.id ? null : selectedGame.id)} className="flex items-center gap-1 bg-neutral-700 hover:bg-neutral-600 px-3 py-2 rounded-xl text-sm transition-colors">
                        <QrCode className="w-4 h-4" /> QR
                      </button>
                    </div>
                  </div>

                  {showQR === selectedGame.id && (
                    <div className="mt-4 p-4 bg-white rounded-xl flex flex-col items-center animate-fade-in">
                      <QRCodeSVG value={`${window.location.origin}/join?code=${selectedGame.room_code}`} size={200} />
                      <p className="text-neutral-800 text-sm mt-2 font-medium">{selectedGame.room_code}</p>
                      <p className="text-neutral-500 text-xs">Escanea para unirte</p>
                    </div>
                  )}

                  {selectedGame.status === 'active' && selectedGame.time_limit_minutes && (
                    <div className="mt-4 flex items-center gap-2 text-lg font-mono">
                      <Clock className="w-5 h-5 text-warning-500" />
                      <span className={getTimeRemaining() === '00:00' ? 'text-error-500' : 'text-white'}>{getTimeRemaining()}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-neutral-800 rounded-2xl p-5 border border-neutral-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-primary-400" />
                      <h3 className="font-semibold">Participantes ({participants.length})</h3>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {participants.map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-neutral-700/50 text-sm">
                          <span>{p.name}</span>
                          {p.group && <span className="text-xs text-neutral-400 bg-neutral-700 px-1.5 py-0.5 rounded">{p.group.name}</span>}
                        </div>
                      ))}
                      {participants.length === 0 && <p className="text-neutral-500 text-sm">Sin participantes aún.</p>}
                    </div>
                  </div>

                  <div className="bg-neutral-800 rounded-2xl p-5 border border-neutral-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-5 h-5 text-warning-400" />
                      <h3 className="font-semibold">Clasificación</h3>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {getLeaderboard().map((entry, i) => (
                        <div key={entry.name + i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-neutral-700/50 text-sm">
                          <span className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-warning-500/20 text-warning-400' : i === 1 ? 'bg-neutral-400/20 text-neutral-300' : i === 2 ? 'bg-orange-700/30 text-orange-400' : 'text-neutral-500'}`}>{i + 1}</span>
                            {entry.name}
                          </span>
                          <span className="text-neutral-400">{entry.completed} estaciones</span>
                        </div>
                      ))}
                      {getLeaderboard().length === 0 && <p className="text-neutral-500 text-sm">Sin completados aún.</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-800 rounded-2xl p-5 border border-neutral-700">
                  <h3 className="font-semibold mb-3">Estaciones ({stations.length})</h3>
                  <div className="space-y-2">
                    {stations.sort((a, b) => a.order_index - b.order_index).map((s) => {
                      const completedCount = completions.filter((c) => c.station_id === s.id).length
                      return (
                        <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-neutral-700/50 text-sm">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary-900/40 text-primary-400 flex items-center justify-center text-xs font-bold">{s.order_index}</span>
                            <div>
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-neutral-400 capitalize">{s.challenge_type}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-success-400">{completedCount} completados</span>
                            <button onClick={() => handleDeleteStation(s.id)} className="text-error-400 hover:text-error-300 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                <MapPin className="w-12 h-12 mb-3 opacity-30" />
                <p>Selecciona un juego para ver el panel</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
