import { useState, useEffect, Suspense, lazy } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "../components/ui/button"
const FlightMap = lazy(() => import("../components/FlightMap"))
import FlightCard from "../components/FlightCard"
import AnimatedSection from "../components/ui/AnimatedSection"
import AnimatedHeading from "../components/ui/AnimatedHeading"
import AnimatedButton from "../components/ui/AnimatedButton"
import GlassCard from "../components/ui/GlassCard"
import SearchBar from "../components/ui/SearchBar"
import CountUp from "../components/CountUp"
import CloudLayer from "../components/cinema/CloudLayer"
import VideoBackground from "../components/cinema/VideoBackground"
import { getLiveFlights, getTodaysFlights, getFlightStats, getAirports, getAirportBoard } from "../services/api"
import { getUserLocation, getDefaultLocation, type LocationInfo } from "../lib/geo"
import type { LiveFlight, FlightDetail, FlightStats, Airport } from "../types"
import {
  Plane, Search, Radar, TrendingUp, RotateCw, Clock,
  Radio, Route as RouteIcon, LayoutDashboard, Globe2, ShieldCheck, Zap,
  PlaneTakeoff, Send, Star, ChevronRight, ChevronDown,
} from "lucide-react"

const HERO_IMG =
  "https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=1920&q=80"
const CABIN_IMG =
  "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1600&q=80"

const HEADLINES = ["live and honest.", "clear and exact.", "instant and precise."]

const FEATURES = [
  { icon: Radio, title: "Live radar", desc: "Every aircraft broadcasting ADS-B, updated every few seconds, clustered and rotatable on a 3D map." },
  { icon: RouteIcon, title: "Flight trails", desc: "Replay the actual path a flight flew — altitude-colored climb, cruise and descent segments." },
  { icon: Clock, title: "Airport boards", desc: "Live departures and arrivals for any airport, with gates, terminals and delay status." },
  { icon: Globe2, title: "Global coverage", desc: "Crowdsourced ADS-B from thousands of receivers, with honest estimates where coverage fades over oceans." },
]

const STEPS = [
  { n: "01", title: "Pick a flight", desc: "Search by flight number, callsign, airport or route — or just browse the live map." },
  { n: "02", title: "Follow it live", desc: "Position, altitude, speed and trail updates in real time, right in your browser." },
  { n: "03", title: "Know before you land", desc: "Scheduled vs estimated times, delay variation, gates and baggage carousels." },
]

const TESTIMONIALS = [
  { name: "Ali Hassan", role: "Pilot, Zanzibar", quote: "I use it on every approach into Abeid Amani Karume. The trail replay is scarily accurate to what we actually fly.", stars: 5 },
  { name: "Grace Mwangi", role: "Travel blogger, Nairobi", quote: "Finally a tracker that doesn't pretend every plane is perfectly positioned over the ocean. The honesty is the feature.", stars: 5 },
  { name: "Tom Becker", role: "Aviation photographer, Berlin", quote: "The altitude-colored trails alone are worth it. I plan photo passes from the airport boards before I leave the house.", stars: 4 },
]

export default function Home() {
  const [liveFlights, setLiveFlights] = useState<LiveFlight[]>([])
  const [todaysFlights, setTodaysFlights] = useState<FlightDetail[]>([])
  const [stats, setStats] = useState<FlightStats | null>(null)
  const [failed, setFailed] = useState<string[]>([])
  const [retryTick, setRetryTick] = useState(0)
  const [location, setLocation] = useState<LocationInfo>(getDefaultLocation())
  const [airports, setAirports] = useState<Airport[]>([])
  const [boardAirport, setBoardAirport] = useState("ZNZ")
  const [board, setBoard] = useState<FlightDetail[]>([])
  const [boardLoading, setBoardLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [headlineIdx, setHeadlineIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setHeadlineIdx((i) => (i + 1) % HEADLINES.length), 3400)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    getUserLocation().then(setLocation)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const loc = location
      const [live, today, statsData, airportData] = await Promise.allSettled([
        getLiveFlights(loc.bounds),
        getTodaysFlights(loc.lat, loc.lng, loc.isZanzibar ? 2000 : 1200),
        getFlightStats(),
        getAirports(),
      ])
      if (cancelled) return
      if (live.status === "fulfilled") {
        setLiveFlights(live.value.slice(0, 100))
        setFailed((f) => f.filter((name) => name !== "live"))
      } else {
        setFailed((f) => (f.includes("live") ? f : [...f, "live"]))
      }
      if (today.status === "fulfilled") {
        setTodaysFlights(today.value.slice(0, 6))
        setFailed((f) => f.filter((name) => name !== "today"))
      } else {
        setFailed((f) => (f.includes("today") ? f : [...f, "today"]))
      }
      if (statsData.status === "fulfilled") {
        setStats(statsData.value)
        setFailed((f) => f.filter((name) => name !== "stats"))
      } else {
        setFailed((f) => (f.includes("stats") ? f : [...f, "stats"]))
      }
      if (airportData.status === "fulfilled") {
        setAirports(airportData.value)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [location, retryTick])

  useEffect(() => {
    if (!boardAirport) return
    setBoardLoading(true)
    getAirportBoard(boardAirport, "departures")
      .then(setBoard)
      .catch(() => setBoard([]))
      .finally(() => setBoardLoading(false))
  }, [boardAirport])

  const allFailed = failed.length >= 3

  const tickerCallsigns = liveFlights.slice(0, 14).map((f) => f.callsign).filter(Boolean) as string[]

  const statsCards = [
    { label: "Flights today", value: stats?.total_flights_today ?? 0, icon: Plane, color: "from-sky-400 to-blue-500", suffix: "" },
    { label: "In the air now", value: stats?.flights_in_air ?? 0, icon: TrendingUp, color: "from-emerald-400 to-teal-500", suffix: "" },
    { label: "Delayed", value: stats?.flights_delayed ?? 0, icon: Clock, color: "from-amber-400 to-orange-500", suffix: "" },
    { label: "Avg delay", value: stats?.average_delay_minutes ?? 0, icon: ShieldCheck, color: "from-rose-400 to-red-500", suffix: " min" },
  ]

  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden">
        <div className="container-custom relative z-10 w-full pt-24 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2.5 rounded-full glass px-4 py-2 text-xs font-semibold text-slate-200"
          >
            <span className="radar-sweep" aria-hidden />
            <span className="font-grotesk tracking-[0.2em] uppercase text-sky-300">Live from Zanzibar</span>
            <span className="hidden text-slate-500 sm:inline">· and 100,000+ aircraft worldwide</span>
          </motion.div>

          <h1 className="font-display mt-6 max-w-3xl text-5xl font-bold leading-[1.04] tracking-tight md:text-7xl">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              The sky,{" "}
            </motion.span>
            <span className="relative inline-flex overflow-hidden align-bottom">
              <AnimatePresence mode="wait">
                <motion.span
                  key={headlineIdx}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="text-gradient-sky inline-block"
                >
                  {HEADLINES[headlineIdx]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg"
          >
            ZanflightGO tracks real aircraft from thousands of crowdsourced receivers —
            real-time positions, flight trails, airport boards and delays — wrapped in a glass-clear interface.
          </motion.p>

          <div className="mt-8 max-w-3xl">
            <SearchBar />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-8 flex flex-wrap items-center gap-4 text-sm"
          >
            <AnimatedButton to="/radar" variant="primary" size="lg" shine>
              <Radar className="h-4 w-4" /> Open live radar
            </AnimatedButton>
            <AnimatedButton to="/flights" variant="glass" size="lg">
              Browse today's flights <ChevronRight className="h-4 w-4" />
            </AnimatedButton>
          </motion.div>

          {/* Live mini-stats */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.95 }}
            className="mt-12 flex max-w-xl flex-wrap gap-3"
          >
            {statsCards.map((s) => (
              <div key={s.label} className="glass rounded-xl px-4 py-2.5">
                <p className="font-display text-lg font-bold leading-none">
                  <CountUp value={s.value} />
                  {s.suffix}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-slate-500"
          aria-hidden
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-40 bg-gradient-to-t from-[#030610] to-transparent" />
      </section>

      {/* ── LIVE CALLSIGN TICKER ─────────────────────────────── */}
      {tickerCallsigns.length >= 3 && (
        <AnimatedSection>
          <section className="marquee glass mx-auto max-w-4xl rounded-2xl py-3" aria-hidden>
            <div className="marquee-track">
              {[...tickerCallsigns, ...tickerCallsigns].map((cs, i) => (
                <span key={`${cs}-${i}`} className="flex items-center gap-3 text-sm whitespace-nowrap text-slate-300">
                  <Plane className="h-3.5 w-3.5 text-sky-400" />
                  {cs}
                  <span className="h-1 w-1 rounded-full bg-white/25" />
                </span>
              ))}
            </div>
          </section>
        </AnimatedSection>
      )}

      {/* ── STATS STRIP ──────────────────────────────────────── */}
      <section className="container-custom mt-16">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statsCards.map((s, i) => (
            <AnimatedSection key={s.label} delay={i * 0.08}>
              <GlassCard maxTilt={5} className="flex items-center gap-4 p-5 hover:border-sky-400/30">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-lg`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">
                    <CountUp value={s.value} />
                    {s.suffix}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </GlassCard>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ── LIVE MAP + TODAY'S FLIGHTS ────────────────────────── */}
      <section className="container-custom mt-24">
        <div className="flex items-end justify-between">
          <AnimatedHeading
            kicker="Live radar"
            accent={location.label}
            className="text-4xl"
          >
            Live near{" "}
          </AnimatedHeading>
          <AnimatedButton to="/radar" variant="outline" size="sm" className="mb-2 hidden md:inline-flex">
            Full radar <ChevronRight className="h-3.5 w-3.5" />
          </AnimatedButton>
        </div>
        <AnimatedSection delay={0.1}>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Positions from crowdsourced ADS-B receivers. Dimmed markers are estimated — coverage can fade over
            oceans and remote regions.
          </p>
        </AnimatedSection>

        {allFailed && (
          <AnimatedSection>
            <GlassCard className="mb-6 p-6 text-center">
              <p className="text-muted-foreground mb-4">
                Couldn't reach the flight data service. If this is the first request in a while, the backend may be
                waking up — try again.
              </p>
              <Button onClick={() => setRetryTick((t) => t + 1)} className="gap-2">
                <RotateCw className="h-4 w-4" /> Retry
              </Button>
            </GlassCard>
          </AnimatedSection>
        )}

        <AnimatedSection delay={0.15}>
          <div className="glass relative overflow-hidden rounded-3xl p-2">
            <CloudLayer density={2} intensity={0.35} />
            <Suspense fallback={<div className="skeleton h-[460px] w-full rounded-2xl" />}>
              <FlightMap
                flights={liveFlights}
                center={[location.lat, location.lng]}
                zoom={location.isZanzibar ? 9 : 10}
                userLocation={{ lat: location.lat, lng: location.lng, label: location.label }}
              />
            </Suspense>
          </div>
        </AnimatedSection>

        <div className="mt-12">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold">Today's flights near {location.label}</h3>
            <Link to="/flights" className="flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {todaysFlights.length > 0
              ? todaysFlights.map((flight, i) => <FlightCard key={flight.flight_number} flight={flight} index={i} />)
              : Array.from({ length: 3 }).map((_, i) => (
                  <GlassCard key={i} className="space-y-4 p-5">
                    <div className="skeleton h-4 w-2/3 rounded" />
                    <div className="skeleton h-4 w-1/2 rounded" />
                    <div className="skeleton h-8 w-24 rounded" />
                  </GlassCard>
                ))}
          </div>
        </div>
      </section>

      {/* ── AIRPORT BOARD ────────────────────────────────────── */}
      <section className="relative mt-28 overflow-hidden py-24">
        <VideoBackground video="takeoffDusk" overlayOpacity={0.7} videoOpacity={0.5} gradient="linear-gradient(180deg,#030610 0%,transparent 12%,transparent 88%,#030610 100%)" />
        <CloudLayer density={3} intensity={0.5} />
        <div className="container-custom relative z-10">
          <AnimatedHeading kicker="Airport boards" accent="any airport" center>
            Live boards,
          </AnimatedHeading>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-slate-300">
            Pick an airport and watch departures as they happen.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-5">
            <AnimatedSection className="lg:col-span-3">
              <GlassCard strong className="p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="pulse-ring absolute inset-0 text-emerald-400" />
                      <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </span>
                    <span className="font-semibold">Departures</span>
                  </div>
                  <select
                    value={boardAirport}
                    onChange={(e) => setBoardAirport(e.target.value)}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                    aria-label="Airport"
                  >
                    {airports.slice(0, 40).map((a) => (
                      <option key={a.iata} value={a.iata} className="bg-slate-900">
                        {a.iata} · {a.city}
                      </option>
                    ))}
                  </select>
                </div>
                {boardLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="skeleton h-12 rounded-xl" />
                    ))}
                  </div>
                ) : board.length > 0 ? (
                  <div className="space-y-1.5">
                    {board.map((f, i) => (
                      <motion.div
                        key={`${f.flight_number}-${f.flight_date}-${f.departure_airport}`}
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.5) }}
                      >
                        <Link
                          to={`/flights/${f.flight_number}`}
                          className="group flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-3 transition-all hover:bg-sky-400/10"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-display w-20 font-bold">{f.flight_number}</span>
                            <span className="text-sm text-muted-foreground group-hover:text-slate-200">
                              {f.departure_airport_name || f.departure_airport}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            {f.departure_time_scheduled && (
                              <span className="tabular-nums text-muted-foreground">
                                {new Date(f.departure_time_scheduled).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                            {f.departure_delay != null && f.departure_delay > 0 && (
                              <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
                                +{f.departure_delay}m
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">{f.status || ""}</span>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No departures found — try another airport.</p>
                )}
              </GlassCard>
            </AnimatedSection>

            <AnimatedSection className="lg:col-span-2" delay={0.12}>
              <GlassCard className="relative h-full min-h-[280px] overflow-hidden p-0">
                <img src={CABIN_IMG} alt="View from an airplane window" className="absolute inset-0 h-full w-full object-cover opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030610] via-[#030610]/50 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-end p-6">
                  <h3 className="font-display text-2xl font-bold">Search any flight</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    Flight number, callsign, airline, route — if it's in the sky, it's in ZanflightGO.
                  </p>
                  <AnimatedButton to="/search" variant="primary" size="md" className="mt-4 self-start" shine>
                    <Search className="h-4 w-4" /> Search flights
                  </AnimatedButton>
                </div>
              </GlassCard>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="container-custom mt-28">
        <AnimatedHeading kicker="Why ZanflightGO" accent="watch the sky" center>
          Built for people who
        </AnimatedHeading>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
          Pilots, photographers, travellers and the curious — everything real-time, nothing exaggerated.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <AnimatedSection key={f.title} delay={i * 0.08}>
              <GlassCard maxTilt={8} className="group h-full p-6 hover:border-sky-400/30">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/25 to-blue-600/25 ring-1 ring-sky-400/30 transition-all duration-500 group-hover:scale-110 group-hover:ring-sky-400/60">
                  <f.icon className="h-5 w-5 text-sky-400" />
                </div>
                <h3 className="font-display mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </GlassCard>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ── PARALLAX TRAILS ──────────────────────────────────── */}
      <section className="relative mt-28 overflow-hidden py-32">
        <VideoBackground video="pinkSunset" overlayOpacity={0.72} videoOpacity={0.55} gradient="linear-gradient(180deg,#030610 0%,transparent 15%,transparent 85%,#030610 100%)" />
        <CloudLayer density={4} intensity={0.6} />
        <div className="container-custom relative z-10">
          <div className="max-w-2xl">
            <AnimatedSection>
              <span className="font-grotesk text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">Flight trails</span>
              <h2 className="font-display mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                Follow the exact path, <span className="text-gradient-sky">not the great-circle guess.</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-300">
                Every trail is the real flown route from ADS-B history — altitude-colored from climb to cruise to
                descent. When coverage is missing, we say so, and draw the planned arc instead.
              </p>
              <AnimatedButton to="/radar" variant="primary" size="lg" className="mt-8" shine>
                <Radar className="h-4 w-4" /> Explore the radar
              </AnimatedButton>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="container-custom mt-28">
        <AnimatedHeading kicker="How it works" accent="touchdown" center>
          From curiosity to
        </AnimatedHeading>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <AnimatedSection key={s.n} delay={i * 0.1}>
              <GlassCard maxTilt={5} className="relative h-full overflow-hidden p-6">
                <span className="font-display pointer-events-none absolute -right-2 -top-6 text-8xl font-extrabold text-white/[0.05]">
                  {s.n}
                </span>
                <span className="font-display flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-bold text-white shadow-lg shadow-sky-500/30">
                  {s.n}
                </span>
                <h3 className="font-display mt-5 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </GlassCard>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="container-custom mt-28">
        <AnimatedHeading kicker="Voices from the aisle" accent="say it best" center>
          People in the sky
        </AnimatedHeading>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <AnimatedSection key={t.name} delay={i * 0.1}>
              <GlassCard className="flex h-full flex-col p-6">
                <div className="flex gap-1" aria-label={`${t.stars} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className={`h-4 w-4 ${s < t.stars ? "fill-amber-400 text-amber-400" : "text-white/20"}`} />
                  ))}
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-200">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="font-display flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/30 to-blue-600/30 text-sm font-bold text-sky-300 ring-1 ring-white/15">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </GlassCard>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ── NEWSLETTER CTA ───────────────────────────────────── */}
      <section className="container-custom mt-28">
        <AnimatedSection>
          <div className="glass-strong relative overflow-hidden rounded-3xl p-10 text-center md:p-16">
            <VideoBackground video="takeoffSun" overlayOpacity={0.55} videoOpacity={0.35} blur="blur(8px)" className="rounded-3xl" />
            <CloudLayer density={3} intensity={0.4} />
            <div className="relative z-10 mx-auto max-w-xl">
              <span className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.25em] text-sky-300 uppercase">
                <PlaneTakeoff className="h-4 w-4" /> The briefing
              </span>
              <h2 className="font-display mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                One email a week, <span className="text-gradient-sky">zero turbulence</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                The week's biggest movements: new routes out of Zanzibar, airport delays worth knowing, and the
                occasional radar oddity.
              </p>
              {subscribed ? (
                <div className="glass mt-7 inline-flex items-center gap-2 rounded-2xl px-6 py-4 font-medium text-emerald-400">
                  <Zap className="h-4 w-4" /> You're on the list — check your inbox.
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (email.trim()) setSubscribed(true)
                  }}
                  className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-sm outline-none transition-colors focus:border-sky-400"
                    aria-label="Email address"
                  />
                  <AnimatedButton type="submit" size="lg" shine>
                    <Send className="h-4 w-4" /> Subscribe
                  </AnimatedButton>
                </form>
              )}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Airplane wing section image is used in the trails CTA above via video */}
      <section className="container-custom mt-24">
        <AnimatedSection>
          <div className="relative overflow-hidden rounded-3xl">
            <img src={HERO_IMG} alt="" className="h-64 w-full object-cover opacity-40 md:h-80" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#030610] via-[#030610]/60 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-lg p-8">
                <p className="font-display text-2xl font-bold leading-snug md:text-3xl">
                  Every plane above you, <span className="text-gradient-sky">accounted for.</span>
                </p>
                <AnimatedButton to="/dashboard" variant="glass" size="md" className="mt-5">
                  <LayoutDashboard className="h-4 w-4" /> Explore the dashboard
                </AnimatedButton>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>
    </div>
  )
}
