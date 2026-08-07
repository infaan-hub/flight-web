import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../lib/utils"
import { Plane, Search, Radar, LayoutDashboard, Menu, X, Globe2 } from "lucide-react"

const navItems = [
  { path: "/", label: "Home", icon: Plane, end: true },
  { path: "/flights", label: "Flights", icon: Globe2, end: false },
  { path: "/search", label: "Search", icon: Search, end: false },
  { path: "/radar", label: "Live Radar", icon: Radar, end: false },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: false },
]

function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const hh = String(now.getUTCHours()).padStart(2, "0")
  const mm = String(now.getUTCMinutes()).padStart(2, "0")
  const ss = String(now.getUTCSeconds()).padStart(2, "0")
  return (
    <div className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 md:flex">
      <span className="text-sky-400/80">UTC</span>
      <span className="font-grotesk tabular-nums tracking-wider">
        {hh}:{mm}
        <span className="blink-soft text-slate-500">:{ss}</span>
      </span>
    </div>
  )
}

export default function Navbar() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const isActive = (path: string, end: boolean) =>
    end ? location.pathname === path : location.pathname.startsWith(path)

  return (
    <header className="sticky top-3 z-50 w-full px-3">
      <div className="container-custom">
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "glass-strong relative flex h-14 items-center justify-between overflow-hidden rounded-2xl px-4 transition-all duration-500",
            scrolled && "h-12"
          )}
        >
          <span className="nav-sweep" aria-hidden />

          {/* Brand */}
          <Link to="/" className="group flex items-center gap-2.5" aria-label="ZanflightGO home">
            <motion.span
              whileHover={{ rotate: -20, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30"
            >
              <Plane className="h-5 w-5 text-white" />
              <span className="pulse-ring absolute inset-0 text-sky-300" />
            </motion.span>
            <span className="font-display text-lg font-bold tracking-tight">
              Zanflight<span className="text-gradient-sky">GO</span>
            </span>
            <span className="ml-1 hidden items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-emerald-300 lg:flex">
              <span className="radar-sweep !h-2 !w-2" />
              LIVE
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="flex items-center gap-1" aria-label="Primary">
            <LiveClock />
            {navItems.map((item) => {
              const active = isActive(item.path, item.end)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active ? "text-sky-300" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-xl border border-sky-400/25 bg-sky-400/10 shadow-[0_0_20px_rgba(56,189,248,0.15)]"
                    />
                  )}
                  <item.icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10 hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
            <button
              onClick={() => setOpen((o) => !o)}
              className="ml-1 rounded-xl border border-white/10 p-2 text-slate-300 transition-colors hover:border-sky-400/40 hover:text-sky-300 md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </nav>
        </motion.div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong mt-2 flex flex-col gap-1 rounded-2xl p-2 md:hidden"
              aria-label="Mobile"
            >
              {navItems.map((item) => {
                const active = isActive(item.path, item.end)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      active ? "bg-sky-400/15 text-sky-300" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-400" />}
                  </Link>
                )
              })}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
