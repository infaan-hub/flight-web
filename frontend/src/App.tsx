import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, useLocation, Link } from "react-router-dom"
import { AnimatePresence, motion, useScroll } from "framer-motion"
import Navbar from "./components/Navbar"
import Aurora from "./components/Aurora"
import CursorRing from "./components/CursorRing"
import CloudLayer from "./components/cinema/CloudLayer"
import SkyFlight from "./components/cinema/SkyFlight"
import RadarLoader from "./components/ui/RadarLoader"
import { Plane, Radar, ShieldCheck } from "lucide-react"

const Home = lazy(() => import("./pages/Home"))
const AllFlights = lazy(() => import("./pages/AllFlights"))
const FlightSearch = lazy(() => import("./pages/FlightSearch"))
const FlightDetail = lazy(() => import("./pages/FlightDetail"))
const LiveRadar = lazy(() => import("./pages/LiveRadar"))
const Dashboard = lazy(() => import("./pages/Dashboard"))

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Suspense
          fallback={
            <div className="container-custom">
              <RadarLoader />
            </div>
          }
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/flights" element={<AllFlights />} />
            <Route path="/flights/:flightNumber" element={<FlightDetail />} />
            <Route path="/search" element={<FlightSearch />} />
            <Route path="/radar" element={<LiveRadar />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

function Footer() {
  return (
    <footer className="relative z-10 mt-24 overflow-hidden border-t border-white/10">
      <CloudLayer density={3} intensity={0.5} className="opacity-50" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#02050f] via-transparent to-transparent" />
      <div className="container-custom py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30">
                <Plane className="h-5 w-5 text-white" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight">
                Zanflight<span className="text-gradient-sky">GO</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              A cinematic window into the world's sky. Real aircraft, real paths, real honesty — crowdsourced
              ADS-B wrapped in glass.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Radar className="h-3.5 w-3.5 text-sky-400" />
              Powered by Django &amp; React · OpenSky Network &amp; AviationStack
            </div>
          </div>
          <div>
            <p className="font-grotesk text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { to: "/radar", label: "Live radar" },
                { to: "/flights", label: "Today's flights" },
                { to: "/search", label: "Flight search" },
                { to: "/dashboard", label: "Dashboard" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-slate-400 transition-colors hover:text-sky-300">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-grotesk text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Honesty</p>
            <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-500">
              <p className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                Statuses follow the standard lifecycle — Scheduled → Departed gate → In air → Landed → At gate.
              </p>
              <p>
                Positions are crowdsourced ADS-B and may be estimated or missing over oceans and remote regions.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-slate-600 sm:flex-row">
          <p>© {new Date().getFullYear()} ZanflightGO. All rights reserved.</p>
          <p>Times shown in UTC · local times are ≈ approximations from airport longitude</p>
        </div>
      </div>
    </footer>
  )
}

function App() {
  const location = useLocation()
  const { scrollYProgress } = useScroll()
  const onHome = location.pathname === "/"

  return (
    <div className="grain relative min-h-screen bg-[#030610] text-foreground">
      <Aurora />
      {onHome && <SkyFlight progress={scrollYProgress} />}
      <CursorRing />
      <Navbar />
      <main className="relative z-10">
        <AnimatedRoutes />
      </main>
      <Footer />
    </div>
  )
}

export default function Root() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}
