'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  lat: number
  lng: number
  radius: number
  onChange: (lat: number, lng: number) => void
}

export default function MapPicker({ lat, lng, radius, onChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const circleRef = useRef<any>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ display_name: string; lat: string; lon: string }[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const moveTo = (newLat: number, newLng: number) => {
    if (!markerRef.current || !circleRef.current || !instanceRef.current) return
    const pos = { lat: newLat, lng: newLng }
    markerRef.current.setLatLng(pos)
    circleRef.current.setLatLng(pos)
    instanceRef.current.setView(pos, 17)
    onChange(newLat, newLng)
  }

  const search = async (q: string) => {
    if (q.trim().length < 3) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=id`,
        { headers: { 'Accept-Language': 'id' } }
      )
      const data = await res.json()
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 500)
  }

  const selectResult = (r: { display_name: string; lat: string; lon: string }) => {
    moveTo(parseFloat(r.lat), parseFloat(r.lon))
    setQuery(r.display_name.split(',').slice(0, 2).join(','))
    setResults([])
  }

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return

    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const container = mapRef.current! as any
      if (container._leaflet_id) container._leaflet_id = null

      const map = L.map(container).setView([lat || -6.2, lng || 106.816], 16)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      const marker = L.marker([lat || -6.2, lng || 106.816], { draggable: true }).addTo(map)
      const circle = L.circle([lat || -6.2, lng || 106.816], {
        radius,
        color: '#0d9488',
        fillColor: '#0d9488',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map)

      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        circle.setLatLng(pos)
        onChange(pos.lat, pos.lng)
      })

      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng)
        circle.setLatLng(e.latlng)
        onChange(e.latlng.lat, e.latlng.lng)
      })

      instanceRef.current = map
      markerRef.current = marker
      circleRef.current = circle
    })

    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove()
        instanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!markerRef.current || !circleRef.current || !instanceRef.current) return
    if (!lat || !lng) return
    const pos = { lat, lng }
    markerRef.current.setLatLng(pos)
    circleRef.current.setLatLng(pos)
    circleRef.current.setRadius(radius)
    instanceRef.current.setView(pos, instanceRef.current.getZoom())
  }, [lat, lng, radius])

  return (
    <div className="space-y-2">
      {/* Search box */}
      <div className="relative">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-teal-300">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={handleInput}
            placeholder="Cari nama tempat, rumah sakit, kantor..."
            className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />
          {searching && (
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>

        {/* Dropdown results */}
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectResult(r)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <p className="font-medium text-gray-800 truncate">
                  {r.display_name.split(',')[0]}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {r.display_name.split(',').slice(1, 3).join(',')}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapRef} className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 z-0" />
    </div>
  )
}
