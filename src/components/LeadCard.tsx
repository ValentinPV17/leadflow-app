import { useRef } from 'react'
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { MapPin, Users, Briefcase, Zap } from 'lucide-react'

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

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'from-emerald-400 to-green-500' :
    score >= 60 ? 'from-yellow-400 to-amber-500' :
    'from-orange-400 to-red-500'

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${color} shadow-lg`}>
      <Zap size={12} className="text-white fill-white" />
      <span className="text-white text-xs font-bold tracking-wide">{score}% match</span>
    </div>
  )
}

function LogoPlaceholder({ name }: { name: string }) {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg flex-shrink-0`}>
      <span className="text-white text-xl font-bold">{name[0].toUpperCase()}</span>
    </div>
  )
}

export default function LeadCard({ lead, isTop, stackIndex, onAccept, onReject }: Props) {
  const x = useMotionValue(0)
  const controls = useAnimation()
  const constraintsRef = useRef(null)

  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18])
  const acceptOpacity = useTransform(x, [0, 100], [0, 1])
  const rejectOpacity = useTransform(x, [-100, 0], [1, 0])
  const cardOpacity = useTransform(x, [-300, -200, 0, 200, 300], [0, 1, 1, 1, 0])

  const scale = isTop ? 1 : 1 - stackIndex * 0.04
  const translateY = isTop ? 0 : stackIndex * 12

  const handleDragEnd = async (_: unknown, info: { offset: { x: number } }) => {
    const threshold = 120
    if (info.offset.x > threshold) {
      await controls.start({ x: 600, opacity: 0, transition: { duration: 0.35 } })
      onAccept(lead.id)
    } else if (info.offset.x < -threshold) {
      await controls.start({ x: -600, opacity: 0, transition: { duration: 0.35 } })
      onReject(lead.id)
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } })
    }
  }

  const triggerAccept = async () => {
    await controls.start({ x: 600, opacity: 0, transition: { duration: 0.35 } })
    onAccept(lead.id)
  }

  const triggerReject = async () => {
    await controls.start({ x: -600, opacity: 0, transition: { duration: 0.35 } })
    onReject(lead.id)
  }

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
      }}
      animate={isTop ? controls : {}}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={isTop ? handleDragEnd : undefined}
      className="absolute inset-x-0 mx-auto w-[85vw] max-w-sm cursor-grab active:cursor-grabbing select-none"
    >
      <div className="relative bg-[#1a1a2e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

        {/* Accept overlay */}
        {isTop && (
          <motion.div
            style={{ opacity: acceptOpacity }}
            className="absolute inset-0 bg-emerald-500/20 z-10 flex items-center justify-center rounded-3xl border-2 border-emerald-400 pointer-events-none"
          >
            <div className="bg-emerald-500 text-white font-black text-3xl px-6 py-2 rounded-2xl rotate-[-15deg] shadow-xl">
              MATCH! ✓
            </div>
          </motion.div>
        )}

        {/* Reject overlay */}
        {isTop && (
          <motion.div
            style={{ opacity: rejectOpacity }}
            className="absolute inset-0 bg-red-500/20 z-10 flex items-center justify-center rounded-3xl border-2 border-red-400 pointer-events-none"
          >
            <div className="bg-red-500 text-white font-black text-3xl px-6 py-2 rounded-2xl rotate-[15deg] shadow-xl">
              SKIP ✗
            </div>
          </motion.div>
        )}

        {/* Top gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500" />

        <div className="p-6 space-y-5">
          {/* Header: logo + score */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {lead.logoUrl
                ? <img src={lead.logoUrl} alt={lead.companyName} className="w-14 h-14 rounded-2xl object-cover shadow-lg" />
                : <LogoPlaceholder name={lead.companyName} />
              }
              <div>
                <h2 className="text-white text-xl font-black leading-tight">{lead.companyName}</h2>
                <span className="text-xs text-white/40 font-medium uppercase tracking-widest">Apollo.io</span>
              </div>
            </div>
            <ScoreBadge score={lead.matchScore} />
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5" />

          {/* Contact */}
          <div className="bg-white/5 rounded-2xl px-4 py-3">
            <p className="text-white font-semibold text-base">{lead.contactName}</p>
            <p className="text-white/60 text-sm mt-0.5 flex items-center gap-1.5">
              <Briefcase size={12} className="text-white/30" />
              {lead.title}
            </p>
          </div>

          {/* Info pills */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <Briefcase size={11} className="text-violet-400" />
              <span className="text-white/70 text-xs font-medium">{lead.industry}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <Users size={11} className="text-cyan-400" />
              <span className="text-white/70 text-xs font-medium">{lead.employeeCount}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <MapPin size={11} className="text-emerald-400" />
              <span className="text-white/70 text-xs font-medium">{lead.location}</span>
            </div>
          </div>

          {/* Score bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-white/40 text-xs">Compatibilidad con tu ICP</span>
              <span className="text-white/60 text-xs font-semibold">{lead.matchScore}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  lead.matchScore >= 80 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                  lead.matchScore >= 60 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                  'bg-gradient-to-r from-orange-400 to-red-500'
                }`}
                style={{ width: `${lead.matchScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Swipe hint */}
        {isTop && (
          <p className="text-center text-white/20 text-[10px] pb-4 tracking-widest uppercase">
            ← deslizá para decidir →
          </p>
        )}
      </div>

      {/* Action buttons — solo en la tarjeta activa */}
      {isTop && (
        <div className="flex items-center justify-center gap-6 mt-5">
          <button
            onClick={triggerReject}
            className="w-16 h-16 rounded-full bg-[#1a1a2e] border-2 border-red-500/50 flex items-center justify-center shadow-xl hover:bg-red-500/20 hover:border-red-400 hover:scale-110 transition-all duration-200 active:scale-95"
          >
            <span className="text-red-400 text-2xl font-black">✗</span>
          </button>
          <button
            onClick={triggerAccept}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-110 transition-all duration-200 active:scale-95"
          >
            <span className="text-white text-3xl font-black">✓</span>
          </button>
          <button
            onClick={triggerReject}
            className="w-16 h-16 rounded-full bg-[#1a1a2e] border-2 border-white/10 flex items-center justify-center shadow-xl hover:bg-white/5 hover:border-white/20 hover:scale-110 transition-all duration-200 active:scale-95"
          >
            <span className="text-white/40 text-lg">→</span>
          </button>
        </div>
      )}
    </motion.div>
  )
}
