'use client'

import { useState, useEffect } from 'react'

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const API_URL = 'http://localhost:5000'
// ─── Fine constants ─────────────────────────────────────────────────────────
const LEAVE_FREE             = 3
const LEAVE_FINE             = 500_000
const ABSENT_FINE            = 1_000_000
const PRACTICE_ABSENT_FINE   = 5_000_000
const PRACTICE_LEAVE_FINE    = 3_000_000
const PRACTICE_LEAVE_PROOF_FINE = 1_500_000

// ─── Helpers ────────────────────────────────────────────────────────────────
function isPracticeDay(dateStr) {
  // dateStr: 'YYYY-MM-DD' – Thursday=4, Friday=5
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDay() === 4 || d.getDay() === 5
}

function getDateKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatLabel(dateStr) {
  const [, m, dd] = dateStr.split('-')
  return `${dd}/${m}`
}

// Returns ['YYYY-MM-DD', …] for Mon–Sun of the current week
function getCurrentWeekDates() {
  const now = new Date()
  const day = now.getDay() // 0=Sun,1=Mon,...
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setHours(12, 0, 0, 0)
  monday.setDate(monday.getDate() - diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
}

function formatWeekLabel(dates) {
  if (!dates.length) return ''
  const fmt = iso => new Date(iso + 'T12:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  return `${fmt(dates[0])} – ${fmt(dates[6])}`
}

function calcFine(leave, absent) {
  return Math.max(0, leave - LEAVE_FREE) * LEAVE_FINE + absent * ABSENT_FINE
}

function calcPracticeFine(pL, pA, pLP) {
  return pL * PRACTICE_LEAVE_FINE + pA * PRACTICE_ABSENT_FINE + pLP * PRACTICE_LEAVE_PROOF_FINE
}

function fineStr(n) {
  if (!n || n === 0) return null
  if (n % 1_000_000 === 0) return `${n / 1_000_000}M`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${n / 1_000}K`
}

// Sub-columns per date: practice days get ซ้อม inserted between Purge and 01:00
function getDateCols(isPractice) {
  const base = [
    { key: 'Airdrop 3 ทุ่ม', label: '21:00', type: 'airdrop', color: 'text-yellow-400' },
    { key: 'Airdrop Purge',   label: 'Purge',  type: 'airdrop', color: 'text-orange-400' },
  ]
  if (isPractice) base.push({ key: 'practice', label: 'ซ้อม', type: 'practice', color: 'text-indigo-300' })
  base.push({ key: 'Airdrop ตี 1', label: '01:00', type: 'airdrop', color: 'text-sky-400' })
  return base
}

// House background / header colours (cycles if more than 7 houses)
const HOUSE_ROW_BG = [
  'bg-rose-950/40',
  'bg-fuchsia-950/40',
  'bg-sky-950/40',
  'bg-emerald-950/40',
  'bg-red-950/40',
  'bg-amber-950/40',
  'bg-teal-950/40',
]
const HOUSE_HDR = [
  'bg-rose-800/60 text-rose-200',
  'bg-fuchsia-800/60 text-fuchsia-200',
  'bg-sky-800/60 text-sky-200',
  'bg-emerald-800/60 text-emerald-200',
  'bg-red-800/60 text-red-200',
  'bg-amber-800/60 text-amber-200',
  'bg-teal-800/60 text-teal-200',
]

// ─── Cell component ──────────────────────────────────────────────────────────
function Cell({ status }) {
  if (!status)               return <span className="text-gray-700 select-none">−</span>
  if (status === 'present')  return <span className="text-emerald-400 font-bold text-sm">✓</span>
  if (status === 'leave')    return <span className="text-amber-400 font-semibold text-[11px]">ลา</span>
  if (status === 'leave_proof') return <span className="text-amber-300 font-semibold text-[10px]">ลา+หลักฐาน</span>
  if (status === 'absent')   return <span className="text-red-400 font-semibold text-[11px]">ขาด</span>
  return <span className="text-gray-700">−</span>
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [houses,  setHouses]  = useState([])
  const [dates,   setDates]   = useState(() => getCurrentWeekDates())   // ['YYYY-MM-DD', …] Mon–Sun current week
  const [aMap,    setAMap]    = useState({})   // dk → airdropType → houseId → name → status
  const [pMap,    setPMap]    = useState({})   // dk → houseId → name → status
  const [fineMap, setFineMap] = useState({})   // 'houseId::name' → { leave, absent, pL, pA, pLP }
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/houses`).then(r          => { if (!r.ok) throw new Error('โหลดข้อมูลบ้านไม่สำเร็จ');    return r.json() }),
      fetch(`${API_URL}/api/attendance/history`).then(r => { if (!r.ok) throw new Error('โหลดประวัติแอร์ดรอปไม่สำเร็จ'); return r.json() }),
      fetch(`${API_URL}/api/practice/history`).then(r  => { if (!r.ok) throw new Error('โหลดประวัติซ้อมไม่สำเร็จ');  return r.json() }),
    ])
      .then(([hl, ah, ph]) => {

        // Airdrop map
        const am = {}
        for (const r of ah) {
          const dk = getDateKey(r.timestamp)
          if (!am[dk])                              am[dk]                              = {}
          if (!am[dk][r.airdropType])               am[dk][r.airdropType]               = {}
          if (!am[dk][r.airdropType][r.houseId])    am[dk][r.airdropType][r.houseId]    = {}
          for (const m of r.members)
            am[dk][r.airdropType][r.houseId][m.name] = m.status
        }
        setAMap(am)

        // Practice map
        const pm = {}
        for (const r of ph) {
          const dk = getDateKey(r.timestamp)
          if (!pm[dk])              pm[dk]              = {}
          if (!pm[dk][r.houseId])   pm[dk][r.houseId]   = {}
          for (const m of r.members) pm[dk][r.houseId][m.name] = m.status
        }
        setPMap(pm)

        // Fine map – all-time history
        const fm = {}
        for (const h of hl)
          for (const name of h.members)
            fm[`${h.id}::${name}`] = { leave: 0, absent: 0, pL: 0, pA: 0, pLP: 0 }

        for (const r of ah)
          for (const m of r.members) {
            const k = `${r.houseId}::${m.name}`
            if (!fm[k]) continue
            if (m.status === 'leave')   fm[k].leave++
            else if (m.status === 'absent') fm[k].absent++
          }

        for (const r of ph)
          for (const m of r.members) {
            const k = `${r.houseId}::${m.name}`
            if (!fm[k]) continue
            if (m.status === 'leave')        fm[k].pL++
            else if (m.status === 'leave_proof') fm[k].pLP++
            else if (m.status === 'absent')  fm[k].pA++
          }

        setFineMap(fm)
        setHouses(hl)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">
      กำลังโหลด...
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400">
      {error}
    </div>
  )

  const dateCols = dates.map(dk => ({ dk, cols: getDateCols(isPracticeDay(dk)) }))

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-12">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[400px] h-[400px] bg-yellow-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-amber-800/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 px-3 py-6 max-w-full">

        {/* Header */}
        <header className="mb-5 max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
            ตารางเช็คชื่อ
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {formatWeekLabel(dates)} · วันพฤหัสและศุกร์มีคอลัมน์ซ้อมเพิ่ม
          </p>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mt-4" />
        </header>

        <div className="overflow-x-auto rounded-2xl border border-gray-800/70 shadow-2xl">
            <table className="text-[11px] border-collapse w-full" style={{ tableLayout: 'fixed' }}>

              {/* ── Header ─────────────────────────────────────────────── */}
              <thead>
                {/* Row 1: date spans */}
                <tr>
                  <th rowSpan={2} className="sticky left-0 z-20 border border-gray-700 bg-gray-800 py-2 text-gray-400 whitespace-nowrap text-center" style={{ width: 60, minWidth: 60 }}>
                    บ้าน
                  </th>
                  <th rowSpan={2} className="sticky left-[60px] z-20 border border-gray-700 bg-gray-800 py-2 text-gray-400 text-center" style={{ width: 28, minWidth: 28 }}>
                    #
                  </th>
                  <th rowSpan={2} className="sticky left-[88px] z-20 border border-gray-700 bg-gray-800 px-2 py-2 text-gray-400 whitespace-nowrap text-left" style={{ width: 120, minWidth: 120 }}>
                    ชื่อสมาชิก
                  </th>
                  {dateCols.map(({ dk, cols }) => (
                    <th
                      key={dk}
                      colSpan={cols.length}
                      className={`border border-gray-700 px-1 py-1.5 text-center font-bold whitespace-nowrap
                        ${isPracticeDay(dk) ? 'bg-indigo-900/40 text-indigo-200' : 'bg-gray-800 text-yellow-300'}`}
                    >
                      {formatLabel(dk)}
                      {isPracticeDay(dk) && (
                        <span className="ml-1 text-[9px] text-indigo-400 font-normal">(ซ้อม)</span>
                      )}
                    </th>
                  ))}
                  <th rowSpan={2} className="sticky right-0 z-20 border border-gray-700 bg-gray-800 px-1 py-1.5 text-red-400 whitespace-nowrap text-center" style={{ width: 54, minWidth: 54 }}>
                    รวม
                  </th>
                </tr>

                {/* Row 2: sub-column labels */}
                <tr>
                  {dateCols.map(({ dk, cols }) =>
                    cols.map(col => (
                      <th
                        key={`${dk}-${col.key}`}
                        style={{ width: col.type === 'practice' ? 36 : 32, minWidth: col.type === 'practice' ? 36 : 32 }}
                        className={`border border-gray-700 px-0 py-1 text-center font-medium whitespace-nowrap
                          ${isPracticeDay(dk) ? 'bg-indigo-950/30' : 'bg-gray-800/70'} ${col.color}`}
                      >
                        {col.label}
                      </th>
                    ))
                  )}
                </tr>
              </thead>

              {/* ── Body ───────────────────────────────────────────────── */}
              <tbody>
                {houses.map((house, hi) => {
                  const rowBg  = HOUSE_ROW_BG[hi % HOUSE_ROW_BG.length]
                  const hdrCls = HOUSE_HDR[hi % HOUSE_HDR.length]

                  return house.members.map((name, idx) => {
                    const fk = `${house.id}::${name}`
                    const f  = fineMap[fk] || { leave: 0, absent: 0, pL: 0, pA: 0, pLP: 0 }
                    const tf = calcFine(f.leave, f.absent) + calcPracticeFine(f.pL, f.pA, f.pLP)

                    return (
                      <tr key={`${house.id}-${idx}`} className={`${rowBg} hover:brightness-110 transition-all duration-100`}>

                        {/* House label – row-spans entire house block */}
                        {idx === 0 && (
                          <td
                            rowSpan={house.members.length}
                            className={`sticky left-0 z-10 border border-gray-700 px-0 py-1 text-center font-bold text-[10px] align-middle whitespace-nowrap ${hdrCls}`}
                            style={{ width: 60, minWidth: 60 }}
                          >
                            {house.name}
                          </td>
                        )}

                        {/* Member # */}
                        <td className={`sticky left-[60px] z-10 border border-gray-700 px-0 py-0.5 text-center text-gray-500 ${HOUSE_ROW_BG[hi % HOUSE_ROW_BG.length]}`}
                          style={{ width: 28, minWidth: 28 }}>
                          {idx + 1}
                        </td>

                        {/* Member name */}
                        <td className={`sticky left-[88px] z-10 border border-gray-700 px-1.5 py-0.5 text-gray-100 font-medium whitespace-nowrap overflow-hidden text-ellipsis ${HOUSE_ROW_BG[hi % HOUSE_ROW_BG.length]}`}
                          style={{ width: 120, minWidth: 120, maxWidth: 120 }}>
                          {name}
                        </td>

                        {/* Status cells */}
                        {dateCols.map(({ dk, cols }) =>
                          cols.map(col => {
                            let status = null
                            if (col.type === 'airdrop') {
                              status = aMap[dk]?.[col.key]?.[house.id]?.[name] ?? null
                            } else if (col.type === 'practice') {
                              status = pMap[dk]?.[house.id]?.[name] ?? null
                            }
                            return (
                              <td
                                key={`${dk}-${col.key}`}
                                className={`border border-gray-700/30 px-0 py-0.5 text-center
                                  ${col.type === 'practice' ? 'bg-indigo-950/20' : ''}`}
                              >
                                <Cell status={status} />
                              </td>
                            )
                          })
                        )}

                        {/* Total fine */}
                        <td className={`sticky right-0 z-10 border border-gray-700 px-1 py-0.5 text-center whitespace-nowrap ${HOUSE_ROW_BG[hi % HOUSE_ROW_BG.length]}`} style={{ width: 54, minWidth: 54 }}>
                          {tf > 0
                            ? <span className="text-red-400 font-black">{fineStr(tf)}</span>
                            : <span className="text-gray-700">−</span>
                          }
                        </td>
                      </tr>
                    )
                  })
                })}


              </tbody>
            </table>
        </div>

        {/* Fine rules */}
        <div className="mt-5 max-w-7xl mx-auto">
          <div className="bg-gray-900/60 border border-gray-700/30 rounded-2xl px-5 py-4">
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
        </div>

      </div>
    </div>
  )
}
