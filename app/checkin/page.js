'use client'

import { useState, useEffect } from 'react'

// ─── DATA ──────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
// const API_URL = 'http://localhost:5000'

// Styling applied to every house (fetched from DB at runtime)
const HOUSE_STYLE = {
  headerGradient: 'from-amber-600 to-yellow-500',
  cardBg:         'bg-amber-500/5',
  border:         'border-amber-500/25',
}

const STATUSES = [
  {
    key: 'present',
    label: 'มา',
    activeClass: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/40 shadow-md',
    inactiveClass: 'bg-transparent text-emerald-400/70 border-emerald-500/30 hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-400/60',
    dotColor: 'bg-emerald-400',
    textColor: 'text-emerald-400',
  },
  {
    key: 'leave',
    label: 'ลา',
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-amber-500/40 shadow-md',
    inactiveClass: 'bg-transparent text-amber-400/70 border-amber-500/30 hover:bg-amber-500/15 hover:text-amber-300 hover:border-amber-400/60',
    dotColor: 'bg-amber-400',
    textColor: 'text-amber-400',
  },
  {
    key: 'absent',
    label: 'ขาด',
    activeClass: 'bg-red-500 text-white border-red-500 shadow-red-500/40 shadow-md',
    inactiveClass: 'bg-transparent text-red-400/70 border-red-500/30 hover:bg-red-500/15 hover:text-red-300 hover:border-red-400/60',
    dotColor: 'bg-red-400',
    textColor: 'text-red-400',
  },
]

const AIRDROP_TYPES = ['Airdrop 3 ทุ่ม', 'Airdrop Purge', 'Airdrop ตี 1']

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function getKey(houseId, idx) {
  return `${houseId}-${idx}`
}

function calcStats(attendance) {
  const values = Object.values(attendance).filter(Boolean)
  const total = HOUSES.reduce((s, h) => s + h.members.length, 0)
  return {
    present: values.filter(v => v === 'present').length,
    leave:   values.filter(v => v === 'leave').length,
    absent:  values.filter(v => v === 'absent').length,
    checked: values.length,
    total,
  }
}

function calcHouseStats(houseId, members, attendance) {
  return {
    present: members.filter((_, i) => attendance[getKey(houseId, i)] === 'present').length,
    leave:   members.filter((_, i) => attendance[getKey(houseId, i)] === 'leave').length,
    absent:  members.filter((_, i) => attendance[getKey(houseId, i)] === 'absent').length,
  }
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function StatCard({ value, label, colorClass, bgClass, borderClass }) {
  return (
    <div className={`${bgClass} ${borderClass} border rounded-2xl p-4 text-center transition-all duration-300`}>
      <div className={`text-3xl font-bold ${colorClass} tabular-nums`}>{value}</div>
      <div className="text-gray-400 text-xs mt-1 font-medium">{label}</div>
    </div>
  )
}

function StatusBadge({ count, status }) {
  const cfg = STATUSES.find(s => s.key === status)
  return (
    <span className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
      {count}
    </span>
  )
}

function HouseCard({ house, attendance, onToggle, onSetAll, isOpen, onToggleOpen }) {
  const hs = calcHouseStats(house.id, house.members, attendance)
  const checked = hs.present + hs.leave + hs.absent
  const total = house.members.length

  return (
    <div
      className={`
        ${house.border}
        border rounded-3xl overflow-hidden
        shadow-xl
        transition-all duration-300
      `}
    >
      {/* ── Clickable Header ── */}
      <button
        onClick={onToggleOpen}
        className={`w-full bg-gradient-to-r ${house.headerGradient} p-4 text-left`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{house.name}</h2>
              <p className="text-white/60 text-xs">
                เช็คแล้ว {checked}/{total} คน
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <StatusBadge count={hs.present} status="present" />
              <StatusBadge count={hs.leave}   status="leave"   />
              <StatusBadge count={hs.absent}  status="absent"  />
            </div>
            {/* Chevron */}
            <div className={`ml-1 text-white/70 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </button>

      {/* ── Collapsible Body ── */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`${house.cardBg} px-4 pt-3 pb-2`}>
          {/* Members List */}
          <div className="space-y-2 mb-4">
            {house.members.map((member, idx) => {
              const current = attendance[getKey(house.id, idx)]
              return (
                <div key={idx} className="flex items-center gap-3 group">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-xs text-gray-500 font-semibold flex-shrink-0 group-hover:border-gray-600 transition-colors">
                      {idx + 1}
                    </div>
                    <span className="text-gray-200 text-sm font-medium truncate">{member}</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {STATUSES.map(s => (
                      <button
                        key={s.key}
                        onClick={() => onToggle(house.id, idx, s.key)}
                        className={`
                          w-11 h-8 rounded-xl text-xs font-bold border
                          transition-all duration-150 active:scale-95
                          ${current === s.key ? s.activeClass : s.inactiveClass}
                        `}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}

function GlobalConfirmModal({ houses, attendance, selectedType, onClose, onConfirm, confirmed }) {
  const allStats = houses.map(house => ({
    house,
    stats: calcHouseStats(house.id, house.members, attendance),
  }))
  const total        = houses.reduce((s, h) => s + h.members.length, 0)
  const totalPresent = allStats.reduce((s, { stats }) => s + stats.present, 0)
  const totalLeave   = allStats.reduce((s, { stats }) => s + stats.leave, 0)
  const totalAbsent  = allStats.reduce((s, { stats }) => s + stats.absent, 0)
  const totalChecked = totalPresent + totalLeave + totalAbsent

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={!confirmed ? onClose : undefined} />
      <div className="relative bg-gray-900 border border-yellow-900/50 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
        {confirmed ? (
          <div className="text-center py-10">
            <div className="text-2xl font-bold text-yellow-400 mb-2">บันทึกสำเร็จ!</div>
            <p className="text-gray-400 mt-2 text-sm">บันทึกการเช็คชื่อทั้งหมดแล้ว</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white">ยืนยันเช็คชื่อทั้งหมด</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block px-2.5 py-0.5 bg-yellow-600/20 border border-yellow-600/30 rounded-lg text-yellow-300 text-xs font-medium">
                  {selectedType}
                </span>
                <span className="text-gray-500 text-xs">เช็คแล้ว {totalChecked}/{total} คน</span>
              </div>
            </div>

            {/* Summary per house */}
            <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-1">
              {allStats.map(({ house, stats }) => (
                <div key={house.id} className="bg-gray-800/40 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-yellow-300 text-sm font-bold">{house.name}</span>
                  <div className="flex gap-3 text-xs font-semibold">
                    <span className="text-emerald-400">{stats.present} มา</span>
                    <span className="text-amber-400">{stats.leave} ลา</span>
                    <span className="text-red-400">{stats.absent} ขาด</span>
                  </div>
                </div>
              ))}
            </div>

            {totalChecked < total && (
              <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-3 py-2.5 mb-4 flex items-center gap-2">
                <span className="text-yellow-400 text-sm font-bold">!</span>
                <p className="text-yellow-300/80 text-xs">
                  ยังไม่ได้เช็ค <span className="font-bold text-yellow-300">{total - totalChecked} คน</span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700/80 text-gray-300 rounded-xl font-medium text-sm transition-colors border border-gray-700/50"
              >
                กลับไปแก้ไข
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 bg-gradient-to-r from-yellow-700 to-amber-600 hover:from-yellow-600 hover:to-amber-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-yellow-600/25 active:scale-95"
              >
                ยืนยัน
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [houses, setHouses]             = useState([])
  const [housesLoading, setHousesLoading] = useState(true)
  const [attendance, setAttendance]     = useState({})
  const [openHouses, setOpenHouses]     = useState(new Set())
  const [selectedType, setSelectedType] = useState(AIRDROP_TYPES[0])
  const [showModal, setShowModal]       = useState(false)
  const [allConfirmed, setAllConfirmed] = useState(false)
  const [dateStr, setDateStr] = useState('')

  // Fetch houses + members from DB
  useEffect(() => {
    fetch(`${API_URL}/api/houses`)
      .then(res => res.json())
      .then(data => {
        const withStyle = data.map(h => ({ ...h, ...HOUSE_STYLE }))
        setHouses(withStyle)
      })
      .catch(err => console.error('โหลด houses ไม่สำเร็จ:', err))
      .finally(() => setHousesLoading(false))
  }, [])

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric',
        weekday: 'long',
      })
    )
  }, [])

  const handleToggle = (houseId, idx, status) => {
    const key = getKey(houseId, idx)
    setAttendance(prev => ({
      ...prev,
      [key]: prev[key] === status ? undefined : status,
    }))
  }

  const handleSetAll = (houseId, count, status) => {
    setAttendance(prev => {
      const next = { ...prev }
      for (let i = 0; i < count; i++) {
        if (status === null) delete next[getKey(houseId, i)]
        else next[getKey(houseId, i)] = status
      }
      return next
    })
  }

  const handleToggleOpen = (houseId) => {
    setOpenHouses(prev => {
      const next = new Set(prev)
      next.has(houseId) ? next.delete(houseId) : next.add(houseId)
      return next
    })
  }

  const handleConfirmAll = async () => {
    const timestamp = new Date().toISOString()
    const records = houses.map(house => {
      const hs = calcHouseStats(house.id, house.members, attendance)
      return {
        id: `${house.id}-${Date.now()}`,
        timestamp,
        houseId: house.id,
        houseName: house.name,
        airdropType: selectedType,
        members: house.members.map((name, idx) => ({
          name,
          status: attendance[getKey(house.id, idx)] || null,
        })),
        present: hs.present,
        leave: hs.leave,
        absent: hs.absent,
      }
    })

    try {
      await Promise.all(records.map(record =>
        fetch(`${API_URL}/api/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        }).then(res => { if (!res.ok) throw new Error('บันทึกไม่สำเร็จ') })
      ))
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message)
      return
    }

    setAllConfirmed(true)
    setTimeout(() => {
      setShowModal(false)
      setAttendance({})
      setAllConfirmed(false)
      setOpenHouses(new Set())
    }, 1800)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        <div className="absolute -top-48 -left-32 w-[500px] h-[500px] bg-yellow-700/15 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-800/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] bg-yellow-900/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <header className="text-center mb-10">
          <div className="mb-3">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent leading-tight">
              Check-in Airdrop
            </h1>
            <p className="text-gray-500 text-sm mt-1">{dateStr}</p>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mt-4" />
        </header>

        {/* ── Airdrop Type Selector ── */}
        <div className="mb-6">
          <p className="text-gray-500 text-xs mb-2 text-center">ประเภท Airdrop</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {AIRDROP_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-150 ${
                  selectedType === type
                    ? 'bg-yellow-600/30 text-yellow-300 border-yellow-500/50'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* ── House Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-10 items-start">
          {housesLoading ? (
            <p className="text-gray-500 col-span-3 text-center py-20">กำลังโหลด...</p>
          ) : houses.map(house => (
            <HouseCard
              key={house.id}
              house={house}
              attendance={attendance}
              onToggle={handleToggle}
              onSetAll={handleSetAll}
              isOpen={openHouses.has(house.id)}
              onToggleOpen={() => handleToggleOpen(house.id)}
            />
          ))}
        </div>

        {/* ── Global Confirm Button ── */}
        {!housesLoading && houses.length > 0 && (
          <div className="sticky bottom-6 flex justify-center pb-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-10 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-green-700/30 hover:shadow-green-600/50 transition-all duration-200 active:scale-95"
            >
              ยืนยันเช็คชื่อ
            </button>
          </div>
        )}

      </div>

      {/* ── Global Confirm Modal ── */}
      {showModal && (
        <GlobalConfirmModal
          houses={houses}
          attendance={attendance}
          selectedType={selectedType}
          confirmed={allConfirmed}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmAll}
        />
      )}
    </div>
  )
}
