'use client'

import { useEffect, useState } from 'react'

type Place = {
  place_id: string
  name: string
  city: string
  business_status: string
  rating: string
  scraped_at: string
  phone: string | null
  line_id: string | null
  email: string | null
  facebook_url: string | null
  instagram_handle: string | null
  last_note: string | null
  last_note_by: string | null
  last_note_at: string | null
  pending_requests: string
}

function ContactBadges({ place }: { place: Place }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {place.phone && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">📞</span>}
      {place.line_id && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">LINE</span>}
      {place.email && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">✉️</span>}
      {place.facebook_url && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">FB</span>}
      {place.instagram_handle && <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded text-xs">IG</span>}
      {!place.phone && !place.line_id && !place.email && !place.facebook_url && !place.instagram_handle &&
        <span className="text-gray-300 text-xs">—</span>}
    </div>
  )
}

function StatusBadge({ place }: { place: Place }) {
  if (parseInt(place.pending_requests) > 0)
    return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 whitespace-nowrap">🟡 Pending</span>
  if (place.last_note)
    return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 whitespace-nowrap">✅ Noted</span>
  return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500 whitespace-nowrap">— No Action</span>
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    timeZone: 'Asia/Bangkok'
  })
}

export default function DashboardPage() {
  const [data, setData] = useState<Place[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [city, setCity] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (city) params.set('city', city)
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    params.set('page', String(page))
    const res = await fetch(`/api/dashboard?${params}`)
    const json = await res.json()
    setData(json.data || [])
    setTotal(json.total)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page, city, status])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchData()
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">📊 Sales Dashboard</h1>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4 flex-wrap">
        <input
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900 placeholder-gray-400"
          placeholder="🔍 Search name / place_id..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900 placeholder-gray-400"
          placeholder="Filter city..."
          value={city}
          onChange={e => { setCity(e.target.value); setPage(1) }}
        />
        <select
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-900"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="">All Status</option>
          <option value="OPERATIONAL">Operational</option>
          <option value="CLOSED_TEMPORARILY">Closed Temp</option>
          <option value="CLOSED_PERMANENTLY">Closed Perm</option>
        </select>
        <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          Search
        </button>
        <span className="text-sm text-gray-500 self-center">Total: {total.toLocaleString()}</span>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
        <table className="w-full text-sm bg-white">
          <thead className="bg-gray-50 text-left border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-gray-600 font-semibold">Name</th>
              <th className="px-4 py-2 text-gray-600 font-semibold">City</th>
              <th className="px-4 py-2 text-gray-600 font-semibold">Contacts</th>
              <th className="px-4 py-2 text-gray-600 font-semibold">Rating</th>
              <th className="px-4 py-2 text-gray-600 font-semibold">Last Action</th>
              <th className="px-4 py-2 text-gray-600 font-semibold">By</th>
              <th className="px-4 py-2 text-gray-600 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : data.map((place, idx) => (
              <tr key={place.place_id}
                className={`border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                <td className="px-4 py-2 font-medium text-gray-900 max-w-xs">
                  <div className="truncate">{place.name || '—'}</div>
                  <div className="text-xs text-gray-400 truncate">{place.place_id}</div>
                </td>
                <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{place.city || '—'}</td>
                <td className="px-4 py-2"><ContactBadges place={place} /></td>
                <td className="px-4 py-2 text-gray-600">{place.rating ?? '—'}</td>
                <td className="px-4 py-2 text-gray-500 max-w-xs">
                  <div className="truncate">{place.last_note ?? '—'}</div>
                  <div className="text-xs text-gray-400">{formatDate(place.last_note_at)}</div>
                </td>
                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{place.last_note_by ?? '—'}</td>
                <td className="px-4 py-2"><StatusBadge place={place} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-2 mt-4 items-center">
        <button
          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 bg-white hover:bg-gray-50"
          onClick={() => setPage(p => p - 1)}
          disabled={page === 1}
        >← Prev</button>
        <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
        <button
          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 bg-white hover:bg-gray-50"
          onClick={() => setPage(p => p + 1)}
          disabled={page === totalPages}
        >Next →</button>
      </div>
    </div>
  )
}