import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../../lib/supabase'
import { useGame } from '../../hooks/useGame'
import { useRealtime } from '../../hooks/useRealtime'
import { QRScanner } from '../../components/QRScanner'
import { ConfettiEffect } from '../../components/ConfettiEffect'
import { Toast } from '../../components/Toast'
import type { Game, Station, Completion, ParticipantSession } from '../../types'
import { MapPin, Clock, Trophy, QrCode, MessageSquare, Lightbulb, Send, ChevronRight, LogOut, TriangleAlert as AlertTriangle } from 'lucide-react'

const grayIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9ca3af" width="28" height="40"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>`,
  className: '', iconSize: [28, 40], iconAnchor: [14, 40],
})
const yellowIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59e0b" width="28" height="40"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>`,
  className: '', iconSize: [28, 40], iconAnchor: [14, 40],
})
const greenIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#22c55e" width="28" height="40"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>`,
  className: '', iconSize: [28, 40], iconAnchor: [14, 40],
})

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.setView(center, map.getZoom()) }, [center, map])
  return null
}

export function PlayPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { getGameByCode, submitCompletion } = useGame()

  const [session, setSession] = useState<ParticipantSession | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [currentStationIndex, setCurrentStationIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)
  const [gameEnded, setGameEnded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load session
  useEffect(() => {
    const raw = localStorage.getItem('mq_session')
    if (raw) {
      try {
        const s = JSON.parse(raw) as ParticipantSession
        setSession(s)
      } catch {
        navigate('/join')
      }
    } else {
      navigate('/join')
    }
  }, [navigate])

  // Load game
  useEffect(() => {
    if (!code) return
    const load = async () => {
      try {
        const g = await getGameByCode(code)
        if (!g) {
          navigate('/join')
          return
        }
        setGame(g)
        setStations(g.stations.sort((a, b) => a.order_index - b.order_index))
        // Load completions for this participant/group
        const { data: compData } = await supabase
          .from('completions')
          .select('*')
          .in('station_id', g.stations.map((s) => s.id))
        if (compData) setCompletions(compData)
        setLoading(false)
      } catch {
        navigate('/join')
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  // Determine current station
  useEffect(() => {
    if (!game || !session) return
    const myCompletions = completions.filter((c) =>
      session.mode === 'group'
        ? c.group_id === session.groupId
        : c.participant_id === session.participantId
    )
    const completedIds = new Set(myCompletions.map((c) => c.station_id))
    const nextIndex = stations.findIndex((s) => !completedIds.has(s.id))
    setCurrentStationIndex(nextIndex === -1 ? stations.length : nextIndex)
  }, [completions, stations, game, session])

  // Timer
  useEffect(() => {
    if (!game?.time_limit_minutes || !game.started_at) return
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const end = new Date(new Date(game.started_at!).getTime() + game.time_limit_minutes! * 60000)
      const diff = end.getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('00:00')
        setGameEnded(true)
        setToast({ message: '¡Tiempo agotado!', type: 'error' })
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        const m = Math.floor(diff / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        setTimeLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      }
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [game])

  // Realtime
  useRealtime('games', `id=eq.${game?.id ?? ''}`, (payload: unknown) => {
    const p = payload as { new: Game }
    if (p.new) {
      setGame(p.new)
      if (p.new.status === 'ended') {
        setGameEnded(true)
        setToast({ message: '¡El juego ha terminado!', type: 'info' })
      }
    }
  })

  useRealtime('completions', null, () => {
    if (!game) return
    supabase.from('completions').select('*').in('station_id', stations.map((s) => s.id)).then(({ data }) => {
      if (data) setCompletions(data)
    })
  })

  const isCompleted = useCallback((stationId: string) => {
    if (!session) return false
    return completions.some((c) =>
      c.station_id === stationId &&
      (session.mode === 'group' ? c.group_id === session.groupId : c.participant_id === session.participantId)
    )
  }, [completions, session])

  const handleSubmitAnswer = async () => {
    if (!session || !game || gameEnded) return
    const station = stations[currentStationIndex]
    if (!station) return
    const correct = station.riddle_answer?.trim().toLowerCase() === answer.trim().toLowerCase()
    if (!correct) {
      setToast({ message: 'Respuesta incorrecta', type: 'error' })
      return
    }
    await completeStation(station.id)
  }

  const handleQRScan = async (value: string) => {
    if (!session || !game || gameEnded) return
    const station = stations[currentStationIndex]
    if (!station) return
    if (station.qr_value && value.trim() === station.qr_value.trim()) {
      await completeStation(station.id)
      setShowQR(false)
    } else {
      setToast({ message: 'Código QR incorrecto', type: 'error' })
    }
  }

  const completeStation = async (stationId: string) => {
    if (!session) return
    try {
      await submitCompletion({
        station_id: stationId,
        participant_id: session.mode === 'solo' ? session.participantId : null,
        group_id: session.mode === 'group' ? session.groupId : null,
        mode: session.mode,
      })
      setConfetti(true)
      setTimeout(() => setConfetti(false), 2500)
      setAnswer('')
      setShowHint(false)
      // Refresh completions
      const { data } = await supabase.from('completions').select('*').in('station_id', stations.map((s) => s.id))
      if (data) setCompletions(data)
    } catch {
      setToast({ message: 'Error al completar', type: 'error' })
    }
  }

  const getLeaderboard = async () => {
    if (!game) return []
    const { data } = await supabase.from('completions').select('*, station:stations(*), participant:participants(*), group:groups(*)').eq('station.game_id', game.id)
    if (!data) return []
    const standings: Record<string, { name: string; completed: number; lastAt: number }> = {}
    for (const c of data as Completion[]) {
      const key = (c as unknown as { group?: { name: string }; participant?: { name: string } }).group?.name ?? (c as unknown as { participant?: { name: string } }).participant?.name ?? 'Unknown'
      if (!standings[key]) standings[key] = { name: key, completed: 0, lastAt: 0 }
      standings[key].completed += 1
      const t = new Date(c.completed_at).getTime()
      if (t > standings[key].lastAt) standings[key].lastAt = t
    }
    return Object.values(standings).sort((a, b) => b.completed - a.completed || a.lastAt - b.lastAt)
  }

  const handleShowLeaderboard = async () => {
    const lb = await getLeaderboard()
    // Store in state for display
    setLeaderboardData(lb)
    setShowLeaderboard(true)
  }

  const [leaderboardData, setLeaderboardData] = useState<{ name: string; completed: number; lastAt: number }[]>([])

  const handleExit = () => {
    localStorage.removeItem('mq_session')
    navigate('/join')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">
        <div className="animate-pulse">Cargando juego...</div>
      </div>
    )
  }

  if (!game || !session) return null

  const totalStations = stations.length
  const myCompleted = stations.filter((s) => isCompleted(s.id)).length
  const progress = totalStations > 0 ? Math.round((myCompleted / totalStations) * 100) : 0
  const currentStation = stations[currentStationIndex]
  const allCompleted = currentStationIndex >= totalStations

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
      {confetti && <ConfettiEffect />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="bg-neutral-800/80 backdrop-blur-sm border-b border-neutral-700 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-900/30 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">{game.title}</h1>
            <p className="text-xs text-neutral-400">{session.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {timeLeft && (
            <div className={`flex items-center gap-1 text-sm font-mono ${timeLeft === '00:00' ? 'text-error-400' : 'text-warning-400'}`}>
              <Clock className="w-4 h-4" />
              {timeLeft}
            </div>
          )}
          <button onClick={handleShowLeaderboard} className="p-2 hover:bg-neutral-700 rounded-lg transition-colors">
            <Trophy className="w-4 h-4 text-warning-400" />
          </button>
          <button onClick={handleExit} className="p-2 hover:bg-error-900/30 rounded-lg transition-colors">
            <LogOut className="w-4 h-4 text-error-400" />
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="px-4 py-2 bg-neutral-800/50">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
          <span>Progreso</span>
          <span>{myCompleted}/{totalStations}</span>
        </div>
        <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 250 }}>
        <MapContainer
          center={[game.center_lat, game.center_lng]}
          zoom={14}
          className="w-full h-full"
          style={{ height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={[game.center_lat, game.center_lng]} />
          {stations.map((s, i) => {
            const completed = isCompleted(s.id)
            const isCurrent = i === currentStationIndex && !completed && !gameEnded && !allCompleted
            const icon = completed ? greenIcon : isCurrent ? yellowIcon : grayIcon
            return (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={icon}>
                <Popup>
                  <div className="text-neutral-900">
                    <div className="font-bold">{s.name}</div>
                    <div className="text-xs">{completed ? 'Completada' : isCurrent ? 'Actual' : 'Pendiente'}</div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* Challenge Panel */}
      <div className="bg-neutral-800 border-t border-neutral-700 rounded-t-2xl -mt-4 relative z-10 animate-slide-up">
        <div className="p-4 space-y-4">
          {gameEnded || game.status === 'ended' ? (
            <div className="text-center py-6 space-y-3">
              <AlertTriangle className="w-12 h-12 text-error-400 mx-auto" />
              <h2 className="text-xl font-bold">¡Tiempo agotado!</h2>
              <p className="text-neutral-400">El juego ha terminado.</p>
              <button onClick={handleShowLeaderboard} className="flex items-center gap-2 mx-auto bg-primary-600 hover:bg-primary-700 px-5 py-2.5 rounded-xl font-medium transition-colors">
                <Trophy className="w-4 h-4" /> Ver clasificación
              </button>
            </div>
          ) : allCompleted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 bg-success-900/30 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8 text-success-400" />
              </div>
              <h2 className="text-xl font-bold">¡Felicidades!</h2>
              <p className="text-neutral-400">Has completado todas las estaciones.</p>
              <button onClick={handleShowLeaderboard} className="flex items-center gap-2 mx-auto bg-primary-600 hover:bg-primary-700 px-5 py-2.5 rounded-xl font-medium transition-colors">
                <Trophy className="w-4 h-4" /> Ver clasificación
              </button>
            </div>
          ) : currentStation ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-neutral-400">Estación {currentStation.order_index} de {totalStations}</div>
                  <h2 className="text-lg font-bold">{currentStation.name}</h2>
                </div>
                <div className="flex items-center gap-1">
                  {currentStation.challenge_type === 'qr' || currentStation.challenge_type === 'both' ? (
                    <QrCode className="w-5 h-5 text-neutral-400" />
                  ) : null}
                  {currentStation.challenge_type === 'riddle' || currentStation.challenge_type === 'both' ? (
                    <MessageSquare className="w-5 h-5 text-neutral-400" />
                  ) : null}
                </div>
              </div>

              {currentStation.hint_text && (
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-2 text-sm text-warning-400 hover:text-warning-300"
                >
                  <Lightbulb className="w-4 h-4" />
                  {showHint ? 'Ocultar pista' : 'Ver pista'}
                </button>
              )}
              {showHint && currentStation.hint_text && (
                <div className="bg-warning-900/20 border border-warning-700/30 rounded-xl p-3 text-sm text-warning-200 animate-fade-in">
                  {currentStation.hint_text}
                </div>
              )}

              {(currentStation.challenge_type === 'riddle' || currentStation.challenge_type === 'both') && (
                <div className="space-y-2">
                  <p className="text-sm text-neutral-300">{currentStation.riddle_text}</p>
                  <div className="flex gap-2">
                    <input
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                      placeholder="Tu respuesta..."
                      className="flex-1 px-4 py-3 rounded-xl bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!answer.trim()}
                      className="px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {(currentStation.challenge_type === 'qr' || currentStation.challenge_type === 'both') && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 transition-colors"
                  >
                    <QrCode className="w-5 h-5" />
                    {showQR ? 'Cerrar escáner' : 'Escanear código QR'}
                  </button>
                  {showQR && (
                    <div className="animate-fade-in">
                      <QRScanner onScan={handleQRScan} onError={(err) => setToast({ message: err, type: 'error' })} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-neutral-400">
              Esperando a que inicie el juego...
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-neutral-800 w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning-400" /> Clasificación
              </h2>
              <button onClick={() => setShowLeaderboard(false)} className="p-2 hover:bg-neutral-700 rounded-lg">
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {leaderboardData.map((entry, i) => (
                <div key={entry.name + i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-neutral-700/50">
                  <span className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-warning-500/20 text-warning-400' : i === 1 ? 'bg-neutral-400/20 text-neutral-300' : i === 2 ? 'bg-orange-700/30 text-orange-400' : 'text-neutral-500'}`}>{i + 1}</span>
                    {entry.name}
                  </span>
                  <span className="text-sm text-neutral-400">{entry.completed} estaciones</span>
                </div>
              ))}
              {leaderboardData.length === 0 && <p className="text-neutral-500 text-sm text-center">Sin datos aún.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
