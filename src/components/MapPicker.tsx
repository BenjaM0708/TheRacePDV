import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search, MapPin } from 'lucide-react'

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = defaultIcon

interface MapPickerProps {
  center: [number, number]
  onCenterChange: (lat: number, lng: number) => void
  markers?: Array<{ id: string; lat: number; lng: number; name: string; color?: string }>
  onMapClick?: (lat: number, lng: number) => void
  zoom?: number
  className?: string
}

function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

function getColoredIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="30" height="42"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [30, 42],
    iconAnchor: [15, 42],
  })
}

export function MapPicker({ center, onCenterChange, markers, onMapClick, zoom = 13, className = '' }: MapPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        onCenterChange(parseFloat(lat), parseFloat(lon))
      }
    } catch {
      // ignore
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar ciudad o lugar..."
          className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={handleSearch}
          disabled={searchLoading}
          className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>
      <div className="relative rounded-xl overflow-hidden border border-neutral-300" style={{ height: 320 }}>
        <MapContainer center={center} zoom={zoom} className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={center} />
          <MapClickHandler onClick={onMapClick} />
          <Marker position={center} icon={defaultIcon} />
          {markers?.map((m) => (
            <Marker
              key={m.id}
              position={[m.lat, m.lng]}
              icon={m.color ? getColoredIcon(m.color) : defaultIcon}
            />
          ))}
        </MapContainer>
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-neutral-600 flex items-center gap-1 shadow">
          <MapPin className="w-3 h-3" />
          Haz clic en el mapa para colocar
        </div>
      </div>
    </div>
  )
}
