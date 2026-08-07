import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { PlaneTakeoff, PlaneLanding, Calendar, Search } from "lucide-react"
import AnimatedButton from "./AnimatedButton"
import { Input } from "../ui/input"

/**
 * The hero glass search panel — flight number, route and date in one
 * cinematic glass bar. Submits to the search page with query params.
 */
export default function SearchBar() {
  const navigate = useNavigate()
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (from.trim()) params.set("departure", from.trim().toUpperCase())
    if (to.trim()) params.set("arrival", to.trim().toUpperCase())
    if (date) params.set("date", date)
    if (from.trim() || to.trim()) {
      navigate(`/search?${params.toString()}`)
    } else {
      navigate("/search")
    }
  }

  const fieldCls =
    "h-11 border-0 bg-transparent focus-visible:ring-0 placeholder:text-slate-500 text-sm font-medium"

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong relative flex flex-col gap-3 rounded-2xl p-3 md:flex-row md:items-center md:gap-0"
      aria-label="Search flights"
    >
      <div className="flex items-center gap-2 px-3 md:flex-1">
        <PlaneTakeoff className="h-4 w-4 shrink-0 text-sky-400" />
        <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From · ZNZ, JNB, LHR" className={fieldCls} aria-label="Departure airport" />
      </div>
      <div className="hidden h-8 w-px bg-white/15 md:block" />
      <div className="flex items-center gap-2 px-3 md:flex-1">
        <PlaneLanding className="h-4 w-4 shrink-0 text-sky-400" />
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To · DAR, NBO, CDG" className={fieldCls} aria-label="Arrival airport" />
      </div>
      <div className="hidden h-8 w-px bg-white/15 md:block" />
      <div className="flex items-center gap-2 px-3">
        <Calendar className="h-4 w-4 shrink-0 text-sky-400" />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} aria-label="Flight date" />
      </div>
      <AnimatedButton type="submit" size="lg" className="justify-center bg-gradient-to-r from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25">
        <Search className="h-4 w-4" /> Find flight
      </AnimatedButton>
    </motion.form>
  )
}
