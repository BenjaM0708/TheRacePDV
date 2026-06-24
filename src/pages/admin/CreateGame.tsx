import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useGame } from '../../hooks/useGame'
import { MapPicker } from '../../components/MapPicker'
import type { GameMode, ChallengeType } from '../../types'
import { ArrowLeft, Save, Trash2, MapPin } from 'lucide-react'

interface StationForm {
  id: string
  name: string
  order_index: number
  lat: number
  lng: number
  challenge_type: ChallengeType
  riddle_text: string
  riddle_answer: string
  qr_value: string
  hint_text: string
}

export function CreateGame() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { createGame, addStation } = useGame()

  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<GameMode>('linear')
  const [timeLimit, setTimeLimit] = useState('')
  const [center, setCenter] = useState<[number, number]>([40.4168, -3.7038]) // Madrid
  const [stations, setStations] = useState<StationForm[]>([])
  const [saving, setSaving] = useState(false)
  const [activeStation, setActiveStation] = useState<string | null>(null)

  const handleMapClick = (lat: number, lng: number) => {
    const newStation: StationForm = {
      id: crypto.randomUUID(),
      name: `Estación ${stations.length + 1}`,
      order_index: stations.length + 1,
      lat,
      lng,
      challenge_type: 'riddle',
      riddle_text: '',
      riddle_answer: '',
      qr_value: '',
      hint_text: '',
    }
    setStations((prev) => [...prev, newStation])
    setActiveStation(newStation.id)
  }

  const updateStation = (id: string, updates: Partial<StationForm>) => {
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const removeStation = (id: string) => {
    setStations((prev) => {
      const filtered = prev.filter((s) => s.id !== id)
      return filtered.map((s, i) => ({ ...s, order_index: i + 1 }))
    })
    if (activeStation === id) setActiveStation(null)
  }

  const handleSave = async () => {
    if (!title.trim()) return alert('Ingresa un título')
    if (!user) return
    setSaving(true)
    try {
      const game = await createGame({
        title,
        mode,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
        center_lat: center[0],
        center_lng: center[1],
      })
      for (const s of stations) {
        await addStation({
          game_id: game.id,
          name: s.name,
          order_index: s.order_index,
          lat: s.lat,
          lng: s.lng,
          challenge_type: s.challenge_type,
          riddle_text: s.riddle_text || null,
          riddle_answer: s.riddle_answer || null,
          qr_value: s.qr_value || null,
          hint_text: s.hint_text || null,
        })
      }
      navigate('/admin')
    } catch {
      alert('Error guardando el juego')
    } finally {
      setSaving(false)
    }
  }

  const active = stations.find((s) => s.id === activeStation)

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <header className="border-b border-neutral-700 bg-neutral-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-2 hover:bg-neutral-700 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Crear Juego</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="bg-neutral-800 rounded-2xl p-5 border border-neutral-700">
              <h2 className="font-semibold mb-4">Configuración</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Título del juego</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Caza del Tesoro 2025"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Modo de juego</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as GameMode)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="linear">Carrera Lineal</option>
                    <option value="rotation">Rotación de Estaciones</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Límite de tiempo (minutos, opcional)</label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="60"
                  />
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 rounded-2xl p-5 border border-neutral-700">
              <h2 className="font-semibold mb-4">Mapa - Ubicación del juego</h2>
              <MapPicker center={center} onCenterChange={(lat, lng) => setCenter([lat, lng])} onMapClick={handleMapClick} markers={stations.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, name: s.name, color: s.id === activeStation ? '#3b82f6' : '#9ca3af' }))} />
              <p className="text-xs text-neutral-500 mt-2">Haz clic en el mapa para agregar estaciones</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-neutral-800 rounded-2xl p-5 border border-neutral-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Estaciones ({stations.length})</h2>
              </div>

              {active ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary-400" />
                    <span className="text-sm text-neutral-400">Lat: {active.lat.toFixed(5)}, Lng: {active.lng.toFixed(5)}</span>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Nombre</label>
                    <input
                      value={active.name}
                      onChange={(e) => updateStation(active.id, { name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Tipo de desafío</label>
                    <select
                      value={active.challenge_type}
                      onChange={(e) => updateStation(active.id, { challenge_type: e.target.value as ChallengeType })}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="riddle">Acertijo / Pista</option>
                      <option value="qr">Código QR</option>
                      <option value="both">Ambos</option>
                    </select>
                  </div>
                  {(active.challenge_type === 'riddle' || active.challenge_type === 'both') && (
                    <>
                      <div>
                        <label className="block text-sm text-neutral-400 mb-1">Texto del acertijo</label>
                        <textarea
                          value={active.riddle_text}
                          onChange={(e) => updateStation(active.id, { riddle_text: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-xl bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-400 mb-1">Respuesta correcta</label>
                        <input
                          value={active.riddle_answer}
                          onChange={(e) => updateStation(active.id, { riddle_answer: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </>
                  )}
                  {(active.challenge_type === 'qr' || active.challenge_type === 'both') && (
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Valor del QR</label>
                      <input
                        value={active.qr_value}
                        onChange={(e) => updateStation(active.id, { qr_value: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Código que debe escanear el participante"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Pista (opcional)</label>
                    <input
                      value={active.hint_text}
                      onChange={(e) => updateStation(active.id, { hint_text: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-700 border border-neutral-600 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setActiveStation(null)} className="flex-1 py-2.5 rounded-xl bg-neutral-700 hover:bg-neutral-600 transition-colors text-sm font-medium">
                      Cerrar
                    </button>
                    <button onClick={() => removeStation(active.id)} className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-error-900/30 text-error-400 hover:bg-error-900/50 transition-colors text-sm font-medium">
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {stations.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveStation(s.id)}
                      className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm transition-colors ${activeStation === s.id ? 'bg-primary-900/30 border border-primary-500' : 'bg-neutral-700/50 hover:bg-neutral-700'}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary-900/40 text-primary-400 flex items-center justify-center text-xs font-bold">{s.order_index}</span>
                        {s.name}
                      </span>
                      <span className="text-xs text-neutral-400 capitalize">{s.challenge_type}</span>
                    </button>
                  ))}
                  {stations.length === 0 && (
                    <div className="text-center py-8 text-neutral-500">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Haz clic en el mapa para agregar estaciones</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="w-full flex items-center justify-center gap-2 bg-success-600 hover:bg-success-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Guardando...' : 'Guardar Juego'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
