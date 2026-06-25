import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LeadCard from './LeadCard'
import type { Lead } from './LeadCard'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Zap } from 'lucide-react'

interface Props {
  leads: Lead[]
  user: User
}

export default function LeadDeck({ leads, user }: Props) {
  const [queue, setQueue] = useState<Lead[]>(leads)
  const [acceptedCount, setAcceptedCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)

  const saveReview = async (leadId: string, action: 'accepted' | 'rejected') => {
    await supabase.from('lead_reviews').insert({
      lead_id: leadId,
      user_id: user.id,
      action,
      reviewed_at: new Date().toISOString(),
    })
  }

  const handleAccept = async (id: string) => {
    await saveReview(id, 'accepted')
    setAcceptedCount(c => c + 1)
    setQueue(q => q.filter(l => l.id !== id))
  }

  const handleReject = async (id: string) => {
    await saveReview(id, 'rejected')
    setRejectedCount(c => c + 1)
    setQueue(q => q.filter(l => l.id !== id))
  }

  if (queue.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center mb-6">
          <Zap size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-white text-2xl font-black mb-2">¡Todo revisado!</h2>
        <p className="text-white/40 text-sm leading-relaxed max-w-xs">
          Vuelve mañana, estamos buscando más matches para ti.
        </p>
        <div className="flex items-center gap-6 mt-8">
          <div className="text-center">
            <p className="text-emerald-400 text-3xl font-black">{acceptedCount}</p>
            <p className="text-white/40 text-xs mt-1">Aceptados</p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <p className="text-red-400 text-3xl font-black">{rejectedCount}</p>
            <p className="text-white/40 text-xs mt-1">Descartados</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {/* Counter */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-white/30 text-xs">{leads.length - queue.length} / {leads.length}</span>
        <div className="flex gap-1">
          {leads.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i < leads.length - queue.length
                  ? 'w-4 bg-emerald-400'
                  : i === leads.length - queue.length
                  ? 'w-6 bg-white/60'
                  : 'w-4 bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card stack */}
      <div className="relative w-full" style={{ height: '62vh', minHeight: 480 }}>
        <AnimatePresence>
          {queue.slice(0, 3).map((lead, i) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isTop={i === 0}
              stackIndex={i}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
