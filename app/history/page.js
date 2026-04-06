'use client'

import { useState, useEffect } from 'react'

const STATUS_LABEL = { present: 'มา', leave: 'ลา', absent: 'ขาด' }
const STATUS_COLOR = {
  present: 'text-emerald-400',
  leave:   'text-amber-400',
  absent:  'text-red-400',
}
const TYPE_BG = {
  'Airdrop 3 ทุ่ม': 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  'Airdrop Purge':   'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Airdrop ตี 1':   'bg-sky-500/15 text-sky-300 border-sky-500/30',
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function HistoryPage() {
  const [records, setRecords]     = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/api/attendance/history`)
      .then(res => {
        if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
        return res.json()
      })
      .then(data => setRecords(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[400px] h-[400px] bg-yellow-700/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-amber-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                ประวัติเช็คชื่อ
              </h1>
              <p className="text-gray-500 text-sm mt-1">{records.length} รายการ</p>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mt-4" />
        </header>

        {loading ? (
          <div className="text-center py-28">
            <p className="text-gray-600">กำลังโหลด...</p>
          </div>
        ) : error ? (
          <div className="text-center py-28">
            <p className="text-red-400">{error}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-28">
            <p className="text-gray-600">ยังไม่มีประวัติการเช็คชื่อ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="border border-yellow-700/20 rounded-2xl overflow-hidden"
              >
                {/* Row header */}
                <button
                  className="w-full px-5 py-4 flex flex-wrap items-center gap-3 text-left hover:bg-white/3 transition-colors"
                  onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                >
                  {/* House badge */}
                  <span className="flex-shrink-0 px-3 py-1 bg-yellow-600/20 border border-yellow-600/30 rounded-lg text-yellow-300 text-xs font-bold">
                    {rec.houseName}
                  </span>

                  {/* Type badge */}
                  <span className={`flex-shrink-0 px-2.5 py-1 border rounded-lg text-xs font-medium ${
                    TYPE_BG[rec.airdropType] || 'bg-gray-500/15 text-gray-300 border-gray-500/30'
                  }`}>
                    {rec.airdropType}
                  </span>

                  {/* Stats */}
                  <div className="flex gap-3 text-xs font-semibold">
                    <span className="text-emerald-400">{rec.present} มา</span>
                    <span className="text-amber-400">{rec.leave} ลา</span>
                    <span className="text-red-400">{rec.absent} ขาด</span>
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    <span className="text-gray-600 text-xs hidden sm:block">{formatDate(rec.timestamp)}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${expandedId === rec.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded member list */}
                {expandedId === rec.id && (
                  <div className="px-5 pb-5 border-t border-yellow-700/15">
                    <p className="text-gray-600 text-xs mt-3 mb-3 sm:hidden">{formatDate(rec.timestamp)}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {rec.members.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-gray-800/40 rounded-xl px-4 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-gray-700/60 flex items-center justify-center text-xs text-gray-500 font-bold flex-shrink-0">{i + 1}</span>
                            <span className="text-gray-200 text-sm">{m.name}</span>
                          </div>
                          {m.status ? (
                            <span className={`text-xs font-bold ${STATUS_COLOR[m.status]}`}>
                              {STATUS_LABEL[m.status]}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">ไม่ได้เช็ค</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
