'use client'

import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
// const API_URL = 'http://localhost:5000'

const LEAVE_FREE  = 3
const LEAVE_FINE  = 500_000
const ABSENT_FINE = 1_000_000

const PRACTICE_ABSENT_FINE      = 5_000_000
const PRACTICE_LEAVE_FINE       = 3_000_000
const PRACTICE_LEAVE_PROOF_FINE = 1_500_000

function calcFine(leave, absent) {
  return Math.max(0, leave - LEAVE_FREE) * LEAVE_FINE + absent * ABSENT_FINE
}

function calcPracticeFine(pLeave, pAbsent, pLeaveProof) {
  return pLeave * PRACTICE_LEAVE_FINE + pAbsent * PRACTICE_ABSENT_FINE + pLeaveProof * PRACTICE_LEAVE_PROOF_FINE
}

// Returns the Monday 06:00:00 of the current week
function getWeekStart() {
  const now = new Date()
  const day = now.getDay() // 0=Sun,1=Mon,...
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  const monday = new Date(now)
  monday.setHours(6, 0, 0, 0)
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

function AllFinesModal({ houses, onClose }) {
  const finedByHouse = houses
    .map(h => ({
      id: h.id,
      name: h.name,
      members: h.members.filter(m => calcFine(m.leave, m.absent) + calcPracticeFine(m.pLeave, m.pAbsent, m.pLeaveProof) > 0),
    }))
    .filter(h => h.members.length > 0)

  const totalFined = finedByHouse.reduce((s, h) => s + h.members.length, 0)
  const grandTotal = finedByHouse.reduce((s, h) =>
    s + h.members.reduce((ss, m) => ss + calcFine(m.leave, m.absent) + calcPracticeFine(m.pLeave, m.pAbsent, m.pLeaveProof), 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700/50 rounded-3xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800">
          <div>
            <h3 className="text-lg font-bold text-white">ค่าปรับทั้งหมด</h3>
            <p className="text-red-400 font-black text-xl mt-0.5">{formatMoney(grandTotal)}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors p-1 text-lg leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {finedByHouse.length === 0 ? (
            <p className="text-gray-500 text-center py-10">ไม่มีค่าปรับ</p>
          ) : finedByHouse.map(house => {
            const houseFineTotal = house.members.reduce((s, m) => s + calcFine(m.leave, m.absent) + calcPracticeFine(m.pLeave, m.pAbsent, m.pLeaveProof), 0)
            return (
              <div key={house.id}>
                {/* House header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-yellow-600/20 border border-yellow-600/30 rounded-lg text-yellow-300 text-xs font-bold flex-shrink-0">
                    {house.name}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-yellow-700/30 to-transparent" />
                  <span className="text-red-400 text-xs font-semibold">{formatMoney(houseFineTotal)}</span>
                </div>
                {/* Members */}
                <div className="space-y-2">
                  {house.members.map(m => {
                    const af  = calcFine(m.leave, m.absent)
                    const pf  = calcPracticeFine(m.pLeave, m.pAbsent, m.pLeaveProof)
                    const tot = af + pf
                    return (
                      <div key={m.name} className="bg-gray-800/60 rounded-2xl px-4 py-3 flex items-center justify-between">
                        <span className="text-gray-100 text-sm font-semibold">{m.name}</span>
                        <span className="text-red-400 font-black">{formatMoney(tot)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <span className="text-gray-500 text-sm">{totalFined} คนมีค่าปรับ</span>
          <button onClick={onClose} className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MembersPage() {
  const [houses, setHouses]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [sortBy, setSortBy]            = useState('order')
  const [weekRange, setWeekRange]       = useState('')
  const [showAllFines, setShowAllFines] = useState(false)

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
      fetch(`${API_URL}/api/practice/history`).then(r => {
        if (!r.ok) throw new Error('โหลดประวัติซ้อมไม่สำเร็จ')
        return r.json()
      }),
    ])
      .then(([houseList, history, practiceHistory]) => {
        // Build stat map per member
        const map = {}
        for (const house of houseList) {
          for (const name of house.members) {
            const key = `${house.id}::${name}`
            map[key] = { name, houseId: house.id, present: 0, leave: 0, absent: 0, pPresent: 0, pLeave: 0, pAbsent: 0, pLeaveProof: 0 }
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
        for (const rec of practiceHistory) {
          if (new Date(rec.timestamp) < weekStart) continue
          for (const m of rec.members) {
            const key = `${rec.houseId}::${m.name}`
            if (!map[key]) continue
            if (m.status === 'present')          map[key].pPresent++
            else if (m.status === 'leave')       map[key].pLeave++
            else if (m.status === 'leave_proof') map[key].pLeaveProof++
            else if (m.status === 'absent')      map[key].pAbsent++
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
  const totalFine  = allMembers.reduce((s, m) => s + calcFine(m.leave, m.absent) + calcPracticeFine(m.pLeave, m.pAbsent, m.pLeaveProof), 0)
  const totalCount = allMembers.length

  function sortMembers(members) {
    if (sortBy === 'fine')   return [...members].sort((a, b) =>
      (calcFine(b.leave, b.absent) + calcPracticeFine(b.pLeave, b.pAbsent, b.pLeaveProof)) -
      (calcFine(a.leave, a.absent) + calcPracticeFine(a.pLeave, a.pAbsent, a.pLeaveProof))
    )
    if (sortBy === 'absent') return [...members].sort((a, b) => b.absent - a.absent || b.leave - a.leave)
    return members // original order
  }

  return (
    <>
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
            <p className="text-gray-600 text-xs">สัปดาห์นี้ <span className="text-yellow-600">{weekRange}</span> <span className="text-gray-700">(รีเซ็ตทุกวันจันทร์ 06.00 น.)</span></p>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mt-4" />
        </header>

        {/* Fine rules */}
        <div className="bg-gray-900/60 border border-gray-700/30 rounded-2xl px-5 py-4 mb-6">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-3">กฎค่าปรับ</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-3">
            <p className="text-yellow-500/80 text-xs font-semibold w-full">แอร์ดรอป</p>
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
          <div className="h-px bg-gray-800 mb-3" />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <p className="text-indigo-400/80 text-xs font-semibold w-full">ซ้อม</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="text-gray-400">ลา ปรับครั้งละ <span className="text-amber-300 font-bold">3M</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
              <span className="text-gray-400">ลา+หลักฐาน ปรับครั้งละ <span className="text-amber-300 font-bold">1.5M</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              <span className="text-gray-400">ขาด ปรับครั้งละ <span className="text-red-300 font-bold">5M</span></span>
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
              {totalFine > 0 ? (
                <button
                  onClick={() => setShowAllFines(true)}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-700/30 hover:bg-red-500/15 hover:border-red-600/40 transition-colors rounded-xl px-4 py-2"
                >
                  <span className="text-gray-400 text-xs">ค่าปรับรวมทั้งหมด</span>
                  <span className="text-red-400 font-black text-sm">{formatMoney(totalFine)}</span>
                  <span className="text-gray-600 text-xs ml-1">เช็ค →</span>
                </button>
              ) : <div />}
            </div>

            {/* Houses */}
            <div className="space-y-8">
              {houses.map(house => {
                const houseMembers = sortMembers(house.members)
                const houseFine = house.members.reduce((s, m) => s + calcFine(m.leave, m.absent) + calcPracticeFine(m.pLeave, m.pAbsent, m.pLeaveProof), 0)
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
                        const airdropFine = calcFine(m.leave, m.absent)
                        const practiceFine = calcPracticeFine(m.pLeave, m.pAbsent, m.pLeaveProof)
                        const fine        = airdropFine + practiceFine
                        const hasFine     = fine > 0
                        const totalPresent = m.present + m.pPresent
                        const totalLeave   = m.leave + m.pLeave + m.pLeaveProof
                        const totalAbsent  = m.absent + m.pAbsent
                        const overLeave    = Math.max(0, m.leave - LEAVE_FREE)
                        const hasLeaveBreakdown  = m.pLeave > 0 || m.pLeaveProof > 0
                        const hasAbsentBreakdown = m.pAbsent > 0
                        return (
                          <div
                            key={`${house.id}-${m.name}`}
                            className={`grid grid-cols-[2rem_1fr_auto_auto] gap-x-3 items-start rounded-2xl px-4 py-3 border transition-colors ${
                              hasFine
                                ? 'bg-red-500/5 border-red-800/25'
                                : 'bg-gray-900/40 border-gray-800/40'
                            }`}
                          >
                            <span className="text-xs text-gray-600 font-bold text-center pt-0.5">{i + 1}</span>

                            <div className="min-w-0">
                              <p className="text-gray-100 text-sm font-medium truncate">{m.name}</p>
                            </div>

                            <div className="flex items-center gap-3 text-sm font-semibold flex-shrink-0">
                              <span>
                                <span className="text-emerald-400">{totalPresent}</span>
                                <span className="text-gray-500 font-normal ml-1">มา</span>
                              </span>

                              {/* ลา with tooltip */}
                              <span className="relative group cursor-default">
                                <span className={overLeave > 0 ? 'text-amber-300' : 'text-amber-500'}>{totalLeave}</span>
                                <span className="text-gray-500 font-normal ml-1">ลา</span>
                                {overLeave > 0 && (
                                  <span className="text-amber-600 text-xs ml-0.5">(+{overLeave})</span>
                                )}
                                {(totalLeave > 0 && (m.leave > 0 || hasLeaveBreakdown)) && (
                                  <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-20 pointer-events-none">
                                    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                                        <span className="text-gray-400">แอร์ดรอป</span>
                                        <span className="text-amber-300 font-bold ml-auto pl-4">{m.leave} ครั้ง</span>
                                      </div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                        <span className="text-gray-400">ซ้อม</span>
                                        <span className="text-indigo-300 font-bold ml-auto pl-4">{m.pLeave} ครั้ง</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                                        <span className="text-gray-400">ซ้อม+หลักฐาน</span>
                                        <span className="text-teal-300 font-bold ml-auto pl-4">{m.pLeaveProof} ครั้ง</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </span>

                              {/* ขาด with tooltip */}
                              <span className="relative group cursor-default">
                                <span className="text-red-400">{totalAbsent}</span>
                                <span className="text-gray-500 font-normal ml-1">ขาด</span>
                                {(totalAbsent > 0 && (m.absent > 0 || hasAbsentBreakdown)) && (
                                  <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-20 pointer-events-none">
                                    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                                        <span className="text-gray-400">แอร์ดรอป</span>
                                        <span className="text-red-300 font-bold ml-auto pl-4">{m.absent} ครั้ง</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                        <span className="text-gray-400">ซ้อม</span>
                                        <span className="text-indigo-300 font-bold ml-auto pl-4">{m.pAbsent} ครั้ง</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </span>
                            </div>

                            <div className="w-16 text-right flex-shrink-0 pt-0.5">
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

      {showAllFines && <AllFinesModal houses={houses} onClose={() => setShowAllFines(false)} />}
    </>
  )
}
