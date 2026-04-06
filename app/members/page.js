'use client'

import { useState, useEffect } from 'react'

const API_URL = 'http://localhost:5000'

const LEAVE_FREE  = 3
const LEAVE_FINE  = 500_000
const ABSENT_FINE = 1_000_000

function calcFine(leave, absent) {
  return Math.max(0, leave - LEAVE_FREE) * LEAVE_FINE + absent * ABSENT_FINE
}

// Returns the Monday 00:00:00 of the current week
function getWeekStart() {
  const now = new Date()
  const day = now.getDay() // 0=Sun,1=Mon,...
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - diff)
  return monday
}

function formatWeekRange() {
  const start = getWeekStart()
  const end   = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = d => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  return `${fmt(start)} – ${fmt(end)}`
}

function formatMoney(n) {
  if (n === 0) return null
  if (n % 1_000_000 === 0) return `${n / 1_000_000}M`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${n / 1_000}K`
}

export default function MembersPage() {
  const [houses, setHouses]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [sortBy, setSortBy]     = useState('order')
  const [weekRange, setWeekRange] = useState('')

  useEffect(() => {
    setWeekRange(formatWeekRange())
  }, [])

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/houses`).then(r => {
        if (!r.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
        return r.json()
      }),
      fetch(`${API_URL}/api/attendance/history`).then(r => {
        if (!r.ok) throw new Error('โหลดประวัติไม่สำเร็จ')
        return r.json()
      }),
    ])
      .then(([houseList, history]) => {
        // Build stat map per member
        const map = {}
        for (const house of houseList) {
          for (const name of house.members) {
            const key = `${house.id}::${name}`
            map[key] = { name, houseId: house.id, present: 0, leave: 0, absent: 0 }
          }
        }
        const weekStart = getWeekStart()
        for (const rec of history) {
          if (new Date(rec.timestamp) < weekStart) continue // ข้ามรายการสัปดาห์ก่อน
          for (const m of rec.members) {
            const key = `${rec.houseId}::${m.name}`
            if (!map[key]) continue
            if (m.status === 'present')     map[key].present++
            else if (m.status === 'leave')  map[key].leave++
            else if (m.status === 'absent') map[key].absent++
          }
        }

        // Group back into houses preserving order
        const grouped = houseList.map(house => ({
          id: house.id,
          name: house.name,
          members: house.members.map(name => map[`${house.id}::${name}`]),
        }))
        setHouses(grouped)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const allMembers = houses.flatMap(h => h.members)
  const totalFine  = allMembers.reduce((s, m) => s + calcFine(m.leave, m.absent), 0)
  const totalCount = allMembers.length

  function sortMembers(members) {
    if (sortBy === 'fine')   return [...members].sort((a, b) => calcFine(b.leave, b.absent) - calcFine(a.leave, a.absent))
    if (sortBy === 'absent') return [...members].sort((a, b) => b.absent - a.absent || b.leave - a.leave)
    return members // original order
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[400px] h-[400px] bg-yellow-700/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-amber-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
            รายชื่อสมาชิก
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-gray-500 text-sm">{totalCount} คน</p>
            <span className="text-gray-700 text-xs">|</span>
            <p className="text-gray-600 text-xs">สัปดาห์นี้ <span className="text-yellow-600">{weekRange}</span> <span className="text-gray-700">(รีเซ็ตทุกวันจันทร์)</span></p>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mt-4" />
        </header>

        {/* Fine rules */}
        <div className="bg-gray-900/60 border border-yellow-800/30 rounded-2xl px-5 py-4 mb-6">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-3">กฎค่าปรับ</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-gray-400">ลาฟรี 3 ครั้ง</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="text-gray-400">ลาเกิน 3 ครั้ง ปรับครั้งละ <span className="text-amber-300 font-bold">500K</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              <span className="text-gray-400">ขาด ปรับครั้งละ <span className="text-red-300 font-bold">1M</span></span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-28">
            <p className="text-gray-600">กำลังโหลด...</p>
          </div>
        ) : error ? (
          <div className="text-center py-28">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              {totalFine > 0 && (
                <span className="text-xs text-gray-500">
                  ค่าปรับรวมทั้งหมด <span className="text-red-400 font-bold text-sm">{formatMoney(totalFine)}</span>
                </span>
              )}
            </div>

            {/* Houses */}
            <div className="space-y-8">
              {houses.map(house => {
                const houseMembers = sortMembers(house.members)
                const houseFine = house.members.reduce((s, m) => s + calcFine(m.leave, m.absent), 0)
                return (
                  <div key={house.id}>
                    {/* House header */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-yellow-600/20 border border-yellow-600/30 rounded-lg text-yellow-300 text-xs font-bold flex-shrink-0">
                        {house.name}
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-yellow-700/30 to-transparent" />
                      <span className="text-xs text-gray-600">{house.members.length} คน</span>
                      {houseFine > 0 && (
                        <span className="text-xs text-red-400 font-semibold">ค่าปรับ {formatMoney(houseFine)}</span>
                      )}
                    </div>

                    {/* Column header */}
                    <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-x-3 px-4 mb-2 text-xs text-gray-600 font-semibold uppercase tracking-wide">
                      <span>#</span>
                      <span>ชื่อ</span>
                      <span className="text-right pr-1">สถิติ</span>
                      <span className="text-right w-16">ค่าปรับ</span>
                    </div>

                    {/* Member rows */}
                    <div className="space-y-2">
                      {houseMembers.map((m, i) => {
                        const fine      = calcFine(m.leave, m.absent)
                        const hasFine   = fine > 0
                        const overLeave = Math.max(0, m.leave - LEAVE_FREE)
                        return (
                          <div
                            key={`${house.id}-${m.name}`}
                            className={`grid grid-cols-[2rem_1fr_auto_auto] gap-x-3 items-center rounded-2xl px-4 py-3 border transition-colors ${
                              hasFine
                                ? 'bg-red-500/5 border-red-800/25'
                                : 'bg-gray-900/40 border-gray-800/40'
                            }`}
                          >
                            <span className="text-xs text-gray-600 font-bold text-center">{i + 1}</span>

                            <div className="min-w-0">
                              <p className="text-gray-100 text-sm font-medium truncate">{m.name}</p>
                            </div>

                            <div className="flex items-center gap-3 text-sm font-semibold flex-shrink-0">
                              <span>
                                <span className="text-emerald-400">{m.present}</span>
                                <span className="text-gray-500 font-normal ml-1">มา</span>
                              </span>
                              <span>
                                <span className={overLeave > 0 ? 'text-amber-300' : 'text-amber-500'}>{m.leave}</span>
                                <span className="text-gray-500 font-normal ml-1">ลา</span>
                                {overLeave > 0 && (
                                  <span className="text-amber-600 text-xs ml-0.5">(+{overLeave})</span>
                                )}
                              </span>
                              <span>
                                <span className="text-red-400">{m.absent}</span>
                                <span className="text-gray-500 font-normal ml-1">ขาด</span>
                              </span>
                            </div>

                            <div className="w-16 text-right flex-shrink-0">
                              {hasFine ? (
                                <span className="text-red-400 font-bold">{formatMoney(fine)}</span>
                              ) : (
                                <span className="text-gray-700 text-xs">-</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
