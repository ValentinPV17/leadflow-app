import { useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { MapPin, Users, Briefcase, Zap, X, Heart } from 'lucide-react'

export type Lead = {
  id: string
  companyName: string
  contactName: string
  title: string
  industry: string
  employeeCount: string
  location: string
  matchScore: number
  logoUrl?: string
}

interface Props {
  lead: Lead
  isTop: boolean
  stackIndex: number
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

const CARD_GRADIENTS = [
  ['#1a1a3e', '#2d1b4e', '#1e3a5f'],
  ['#1e2a1e', '#1a3a2e', '#0d2233'],
  ['#2a1a1e', '#3d1a2e', '#1f1040'],
  ['#1a2a3a', '#0d2040', '#1a3050'],
  ['#2a1a2a', '#3a1040', '#1a1a3a'],
]

function getGradient(name: string) {
  const idx = name.charCodeAt(0) % CARD_GRADIENTS.length
  const [c1, c2, c3] = CARD_GRADIENTS[idx]
  return `linear-gradient(145deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function getAccentColor(name: string) {
  const accents = ['#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c']
  return accents[name.charCodeAt(0) % accents.length]
}

function ScorePill({ score }: { score: number }) {
  const bg = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171'
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg"
      style={{ backgroundColor: `${bg}22`, border: `1px solid ${bg}55` }}
    >
      <Zap size={11} style={{ color: bg }} fill={bg} />
      <span className="text-xs font-bold" style={{ color: bg }}>{score}%</span>
    </div>
  )
}

export default function LeadCard({ lead, isTop, stackIndex, onAccept, onReject }: Props) {
  const [logoSrc, setLogoSrc] = useState<string | null>(lead.logoUrl ?? null)
  const [logoFailed, setLogoFailed] = useState(false)

  const handleLogoError = () => {
    // Clearbit failed → try Google Favicon
    if (logoSrc && logoSrc.includes('clearbit')) {
      const domain = logoSrc.replace('https://logo.clearbit.com/', '').split('?')[0]
      setLogoSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`)
    } else {
      setLogoFailed(true)
    }
  }
  const x = useMotionValue(0)
  const controls = useAnimation()
  const constraintsRef = useRef(null)

  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14])
  const acceptOpacity = useTransform(x, [20, 120], [0, 1])
  const rejectOpacity = useTransform(x, [-120, -20], [1, 0])
  const cardOpacity = useTransform(x, [-320, -200, 0, 200, 320], [0, 1, 1, 1, 0])

  const scale = isTop ? 1 : 1 - stackIndex * 0.045
  const translateY = isTop ? 0 : stackIndex * 14

  const handleDragEnd = async (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 110) {
      await controls.start({ x: 700, opacity: 0, transition: { duration: 0.3 } })
      onAccept(lead.id)
    } else if (info.offset.x < -110) {
      await controls.start({ x: -700, opacity: 0, transition: { duration: 0.3 } })
      onReject(lead.id)
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } })
    }
  }

  const triggerAccept = async () => {
    await controls.start({ x: 700, opacity: 0, transition: { duration: 0.3 } })
    onAccept(lead.id)
  }

  const triggerReject = async () => {
    await controls.start({ x: -700, opacity: 0, transition: { duration: 0.3 } })
    onReject(lead.id)
  }

  const accent = getAccentColor(lead.companyName)
  const initials = getInitials(lead.contactName)

  return (
    <motion.div
      ref={constraintsRef}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? cardOpacity : 1,
        scale,
        y: translateY,
        zIndex: 10 - stackIndex,
        originY: 1,
      }}
      animate={isTop ? controls : {}}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={isTop ? handleDragEnd : undefined}
      className="absolute inset-x-0 mx-auto w-[85vw] max-w-sm select-none"
    >
      {/* CARD */}
      <div
        className="relative rounded-[28px] overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
        style={{ height: '62vh', minHeight: 460, background: getGradient(lead.companyName) }}
      >
        {/* Accept overlay */}
        {isTop && (
          <motion.div
            style={{ opacity: acceptOpacity }}
            className="absolute inset-0 z-20 pointer-events-none rounded-[28px] border-[3px] border-emerald-400"
          >
            <div className="absolute top-8 left-6 bg-emerald-500 text-white font-black text-2xl px-5 py-2 rounded-2xl rotate-[-20deg] shadow-xl tracking-wide">
              MATCH ✓
            </div>
          </motion.div>
        )}

        {/* Reject overlay */}
        {isTop && (
          <motion.div
            style={{ opacity: rejectOpacity }}
            className="absolute inset-0 z-20 pointer-events-none rounded-[28px] border-[3px] border-red-400"
          >
            <div className="absolute top-8 right-6 bg-red-500 text-white font-black text-2xl px-5 py-2 rounded-2xl rotate-[20deg] shadow-xl tracking-wide">
              SKIP ✗
            </div>
          </motion.div>
        )}

        {/* Top bar: score */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between">
          <ScorePill score={lead.matchScore} />
          <div className="text-[10px] text-white/30 font-medium tracking-widest uppercase pt-1.5">Apollo.io</div>
        </div>

        {/* Logo / Avatar central */}
        <div className="absolute inset-0 flex items-center justify-center">
          {logoSrc && !logoFailed ? (
            <div className="w-28 h-28 rounded-2xl flex items-center justify-center shadow-2xl bg-white overflow-hidden">
              <img
                src={logoSrc}
                alt={lead.companyName}
                className="w-full h-full object-contain p-3"
                onError={handleLogoError}
              />
            </div>
          ) : (
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center shadow-2xl border-4"
              style={{ background: `linear-gradient(135deg, ${accent}44, ${accent}22)`, borderColor: `${accent}33` }}
            >
              <span className="text-4xl font-black" style={{ color: accent }}>{initials}</span>
            </div>
          )}
        </div>

        {/* Bottom gradient overlay */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 pt-16"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)' }}
        >
          {/* Name + title */}
          <h2 className="text-white text-2xl font-black leading-tight">{lead.contactName}</h2>
          <p className="text-white/60 text-sm mt-0.5 flex items-center gap-1.5">
            <Briefcase size={11} className="text-white/30 flex-shrink-0" />
            <span className="truncate">{lead.title}</span>
          </p>

          {/* Divider */}
          <div className="h-px bg-white/10 my-3" />

          {/* Company + pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
            >
              {lead.companyName}
            </div>
            <div className="flex items-center gap-1 text-white/40 text-[11px]">
              <Users size={10} />
              <span>{lead.employeeCount}</span>
            </div>
            <div className="flex items-center gap-1 text-white/40 text-[11px]">
              <MapPin size={10} />
              <span>{lead.location}</span>
            </div>
          </div>

          {/* ICP bar */}
          <div className="mt-3">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${lead.matchScore}%`,
                  background: `linear-gradient(to right, ${accent}, ${accent}99)`,
                }}
              />
            </div>
            <p className="text-[10px] text-white/25 mt-1 text-right">Compatibilidad con tu ICP</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {isTop && (
        <div className="flex items-center justify-center gap-6 mt-5">
          <button
            onClick={triggerReject}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ background: '#1a1a2e', border: '2px solid rgba(248,113,113,0.5)' }}
          >
            <X size={24} className="text-red-400" strokeWidth={2.5} />
          </button>
          <button
            onClick={triggerAccept}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #34d399, #06b6d4)', boxShadow: '0 8px 24px rgba(52,211,153,0.35)' }}
          >
            <Heart size={24} className="text-white" fill="white" strokeWidth={0} />
          </button>
        </div>
      )}
    </motion.div>
  )
}
