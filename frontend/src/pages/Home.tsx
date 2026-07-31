import { useState, useEffect, useRef, Suspense, lazy } from "react"
import { Link } from "react-router-dom"
import { animate, eases } from "animejs"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
const FlightMap = lazy(() => import("../components/FlightMap"))
import FlightCard from "../components/FlightCard"
import Reveal from "../components/Reveal"
import TiltedCard from "../components/TiltedCard"
import CountUp from "../components/CountUp"
import FlyingPlane from "../components/FlyingPlane"
import { getLiveFlights, getTodaysFlights, getFlightStats, getAirports, getAirportBoard } from "../services/api"
import { getUserLocation, getDefaultLocation, type LocationInfo } from "../lib/geo"
import type { LiveFlight, FlightDetail, FlightStats, Airport } from "../types"
import {
  Plane, Search, Radar, TrendingUp, ArrowRight, RotateCw, Clock,
  Radio, Route as RouteIcon, LayoutDashboard, Globe2, ShieldCheck, Zap,
  PlaneTakeoff, PlaneLanding, Send, Star, ChevronRight, Calendar,
} from "lucide-react"

const HERO_IMG =
  "https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=1920&q=80"
const WING_IMG =
  "https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=1920&q=80"
const CABIN_IMG =
  "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1600&q=80"

const HERO_PLANE = (
  <svg viewBox="0 0 64 24" className="h-full w-full" aria-hidden>
    <path
      d="M62 13.5 38 5.5v-3a2.2 2.2 0 0 0-4.3-.6L24 11.5l-15-4.5V5l5-2.6V1.6l6.5 3.2 5.5-2.8V.8a1.5 1.5 0 0 0-2.5-1l-6 5.6L10 8.2v4.2l6-3v3l-5 2.1v5.2c0 .8.6 1.5 1.5 1.5.6 0 1.2-.4 1.4-.9l6.3-10.5L25 8.4l1.6 8.5-3.6 7.4c-.4.9.2 1.9 1.1 1.9.5 0 1-.3 1.3-.8l7.4-10.2L41 14l7.8 16.3a1.6 1.6 0 0 0 2.9-.7L58 17l4-1.2v-2.3z"
      fill="#fff"
    />
  </svg>
)

const FEATURES = [
  { icon: Radio, title: "Live radar", desc: "Every aircraft broadcasting ADS-B, updated every few seconds, clustered and rotatable on a 3D map.", img: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=70" },
  { icon: RouteIcon, title: "Flight trails", desc: "Replay the actual path a flight flew — altitude-colored climb, cruise and descent segments.", img: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=800&q=70" },
  { icon: Clock, title: "Airport boards", desc: "Live departures and arrivals for any airport, with gates, terminals and delay status.", img: "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=800&q=70" },
  { icon: Globe2, title: "Global coverage", desc: "Crowdsourced ADS-B from thousands of receivers, with honest estimates where coverage fades over oceans.", img: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=70" },
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
  const heroPlaneRef = useRef<HTMLDivElement>(null)
  const heroTakeoffRef = useRef(false)

  useEffect(() => {
    getUserLocation().then(setLocation)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const loc = location
      const [live, today, statsData] = await Promise.allSettled([
        getLiveFlights(loc.bounds),
        getTodaysFlights(loc.lat, loc.lng, loc.isZanzibar ? 2000 : 1200),
        getFlightStats(),
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
    }
    load()
    return () => {
      cancelled = true
    }
  }, [location, retryTick])

  // Airport boards widget
  useEffect(() => {
    getAirports().then(setAirports).catch(() => setAirports([]))
  }, [])

  useEffect(() => {
    setBoardLoading(true)
    getAirportBoard(boardAirport, "departures")
      .then((f) => setBoard(f.slice(0, 6)))
      .catch(() => setBoard([]))
      .finally(() => setBoardLoading(false))
  }, [boardAirport])

  // Hero takeoff: as soon as the user scrolls, the plane climbs out of frame (anime.js)
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 90 && !heroTakeoffRef.current && heroPlaneRef.current) {
        heroTakeoffRef.current = true
        animate(heroPlaneRef.current, {
          translateY: ["0vh", "-46vh"],
          translateX: ["0vw", "26vw"],
          rotate: [-8, -16],
          opacity: [1, 0],
          duration: 1600,
          easing: eases.inOutQuad,
        })
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const allFailed = failed.length === 3

  return (
    <div className="space-y-24">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative -mt-20 min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt="Airplane taking off into a sunset sky"
            className="h-full w-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#05070f]/70 via-[#05070f]/45 to-[#05070f]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05070f]/80 via-transparent to-transparent" />
        </div>

        {/* Hero plane — takes off when you scroll */}
        <div
          ref={heroPlaneRef}
          className="pointer-events-none absolute z-20"
          style={{ right: "18%", top: "30%", width: 150, transform: "rotate(-8deg)" }}
          aria-hidden
        >
          {HERO_PLANE}
          <div className="absolute inset-x-0 top-full mt-1 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>

        <div className="container-custom relative z-10 pt-28 pb-16">
          <Reveal direction="none">
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-sky-200 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live ADS-B coverage · {stats ? `${stats.flights_in_air.toLocaleString()} aircraft airborne` : "thousands of aircraft"}
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1.02] tracking-tight">
              The sky,
              <br />
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                live and honest.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              ZanflightGO tracks real aircraft from thousands of crowdsourced receivers —
              real-time positions, flight trails, airport boards and delays, wrapped in a glass-clear interface.
            </p>
          </Reveal>

          {/* Glass search bar */}
          <Reveal delay={0.2}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                window.location.href = "/search"
              }}
              className="glass-strong mt-8 flex flex-col md:flex-row items-stretch gap-3 rounded-2xl p-3 md:items-center"
            >
              <div className="flex items-center gap-2 px-3 flex-1">
                <PlaneTakeoff className="h-4 w-4 shrink-0 text-sky-400" />
                <Input placeholder="From (e.g. ZNZ, JNB, LHR)" className="border-0 bg-transparent focus-visible:ring-0 h-10" />
              </div>
              <div className="hidden md:block w-px h-8 bg-white/15" />
              <div className="flex items-center gap-2 px-3 flex-1">
                <PlaneLanding className="h-4 w-4 shrink-0 text-sky-400" />
                <Input placeholder="To (e.g. DAR, NBO, CDG)" className="border-0 bg-transparent focus-visible:ring-0 h-10" />
              </div>
              <div className="hidden md:block w-px h-8 bg-white/15" />
              <div className="flex items-center gap-2 px-3 flex-1">
                <Calendar className="h-4 w-4 shrink-0 text-sky-400" />
                <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="border-0 bg-transparent focus-visible:ring-0 h-10" />
              </div>
              <Button type="submit" size="lg" className="gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/25">
                <Search className="h-4 w-4" /> Find flight
              </Button>
            </form>
          </Reveal>

          <Reveal delay={0.28}>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <Link to="/radar" className="group flex items-center gap-1.5 rounded-full glass px-4 py-2 font-medium text-slate-200 transition-colors hover:text-sky-300">
                <Radar className="h-4 w-4" /> Open live radar
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="hidden sm:block">or</span>
              <Link to="/flights" className="flex items-center gap-1.5 px-2 py-2 font-medium hover:text-sky-300 transition-colors">
                Browse today's flights <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 text-xs tracking-widest uppercase animate-bounce" aria-hidden>
          Scroll
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────── */}
      <section className="container-custom">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Flights today", value: stats?.total_flights_today ?? 0, icon: Plane, color: "from-sky-400 to-blue-500" },
            { label: "In the air now", value: stats?.flights_in_air ?? 0, icon: TrendingUp, color: "from-emerald-400 to-teal-500" },
            { label: "Delayed", value: stats?.flights_delayed ?? 0, icon: Clock, color: "from-amber-400 to-orange-500" },
            { label: "Avg delay", value: stats?.average_delay_minutes ?? 0, icon: ShieldCheck, color: "from-rose-400 to-red-500", suffix: " min" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.07}>
              <div className="glass rounded-2xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-lg`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">
                    <CountUp value={s.value} />
                    {s.suffix || ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── LIVE FLIGHTS + MAP ───────────────────────────────── */}
      <section className="container-custom">
        <Reveal>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                Live near <span className="text-sky-400">{location.label}</span>
              </h2>
              <p className="text-muted-foreground mt-2 max-w-lg text-sm">
                Positions from crowdsourced ADS-B receivers. Dimmed markers are estimated — coverage can fade over
                oceans and remote regions.
              </p>
            </div>
            <Link to="/radar" className="hidden md:flex items-center gap-1.5 text-sm font-medium text-sky-400 hover:text-sky-300">
              Full radar <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        {allFailed && (
          <div className="glass rounded-2xl p-6 text-center mb-6">
            <p className="text-muted-foreground mb-4">
              Couldn't reach the flight data service. If this is the first request in a while, the backend may be
              waking up — try again.
            </p>
            <Button onClick={() => setRetryTick((t) => t + 1)} className="gap-2">
              <RotateCw className="h-4 w-4" /> Retry
            </Button>
          </div>
        )}

        <Reveal>
          <div className="glass rounded-2xl p-2">
            <Suspense
              fallback={<div className="w-full h-[460px] rounded-xl bg-muted animate-pulse" />}
            >
              <FlightMap
                flights={liveFlights}
                center={[location.lat, location.lng]}
                zoom={location.isZanzibar ? 9 : 10}
                userLocation={{ lat: location.lat, lng: location.lng, label: location.label }}
              />
            </Suspense>
          </div>
        </Reveal>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold">Today's flights near {location.label}</h3>
            <Link to="/flights" className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysFlights.length > 0
              ? todaysFlights.map((flight) => <FlightCard key={flight.flight_number} flight={flight} />)
              : Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass rounded-2xl p-5 space-y-3">
                    <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse" />
                    <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* ── AIRPORT BOARD ────────────────────────────────────── */}
      <section className="container-custom">
        <Reveal>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                Live boards, <span className="text-sky-400">any airport</span>
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">Pick an airport and watch departures as they happen.</p>
            </div>
          </div>
        </Reveal>
        <div className="grid lg:grid-cols-5 gap-6">
          <Reveal className="lg:col-span-3">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-sky-400" />
                  <span className="font-semibold">Departures</span>
                </div>
                <select
                  value={boardAirport}
                  onChange={(e) => setBoardAirport(e.target.value)}
                  className="rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
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
                    <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : board.length > 0 ? (
                <div className="space-y-2">
                  {board.map((f) => (
                    <Link
                      key={`${f.flight_number}-${f.flight_date}-${f.departure_airport}`}
                      to={`/flights/${f.flight_number}`}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold w-20">{f.flight_number}</span>
                        <span className="text-sm text-muted-foreground">{f.departure_airport_name || f.departure_airport}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {f.departure_time_scheduled && (
                          <span className="text-muted-foreground">
                            {new Date(f.departure_time_scheduled).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {f.departure_delay != null && f.departure_delay > 0 && (
                          <span className="text-xs font-semibold text-amber-400">+{f.departure_delay}m</span>
                        )}
                        <span className="text-xs text-muted-foreground">{f.status || ""}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No departures found — try another airport.</p>
              )}
            </div>
          </Reveal>
          <Reveal className="lg:col-span-2" delay={0.1}>
            <div className="relative h-full min-h-[280px] overflow-hidden rounded-2xl glass">
              <img src={CABIN_IMG} alt="View from an airplane window" className="absolute inset-0 h-full w-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070f] via-[#05070f]/40 to-transparent" />
              <div className="relative z-10 flex h-full flex-col justify-end p-6">
                <FlyingPlane variant="cross" size={72} className="top-10" />
                <h3 className="font-display text-2xl font-bold">Search any flight</h3>
                <p className="text-sm text-slate-300 mt-1">
                  Flight number, callsign, airline, route — if it's in the sky, it's in ZanflightGO.
                </p>
                <Link to="/search" className="mt-4">
                  <Button className="gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500">
                    <Search className="h-4 w-4" /> Search flights
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="container-custom">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Built for people who <span className="text-sky-400">watch the sky</span>
            </h2>
            <p className="text-muted-foreground mt-3">Pilots, photographers, travellers and the curious — everything real-time, nothing exaggerated.</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <TiltedCard className="h-full overflow-hidden">
                <div className="relative h-32 overflow-hidden">
                  <img src={f.img} alt="" className="h-full w-full object-cover opacity-70" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] to-transparent" />
                </div>
                <div className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/20 to-blue-600/20 border border-sky-400/30 mb-3">
                    <f.icon className="h-5 w-5 text-sky-400" />
                  </div>
                  <h3 className="font-display font-bold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5">{f.desc}</p>
                </div>
              </TiltedCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PARALLAX FLIGHT ──────────────────────────────────── */}
      <section className="relative overflow-hidden py-28">
        <img src={WING_IMG} alt="Airplane wing above the clouds at cruising altitude" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-[#05070f]/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05070f] via-transparent to-[#05070f]" />
        <FlyingPlane variant="cross" size={120} className="top-1/4 left-0" />
        <div className="container-custom relative z-10">
          <div className="max-w-lg">
            <Reveal>
              <span className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300">Flight trails</span>
              <h2 className="font-display text-3xl md:text-5xl font-bold mt-3">
                Follow the exact path, not the great-circle guess.
              </h2>
              <p className="text-slate-300 mt-4">
                Every trail is the real flown route from ADS-B history — altitude-colored from climb to cruise to
                descent. When coverage is missing, we say so, and draw the planned arc instead.
              </p>
              <Link to="/radar">
                <Button size="lg" className="mt-6 gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/25">
                  <Radar className="h-4 w-4" /> Explore the radar
                </Button>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="container-custom">
        <Reveal>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
            From <span className="text-sky-400">curiosity</span> to touchdown in three steps
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="glass relative rounded-2xl p-6 h-full">
                <span className="font-display absolute top-5 right-6 text-5xl font-extrabold text-white/[0.06]">{s.n}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 font-display font-bold text-white shadow-lg shadow-sky-500/25">
                  {s.n}
                </span>
                <h3 className="font-display font-bold text-lg mt-4">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="container-custom">
        <Reveal>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
            People in the sky <span className="text-sky-400">say it best</span>
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <div className="glass rounded-2xl p-6 h-full flex flex-col">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className={`h-4 w-4 ${s < t.stars ? "text-amber-400 fill-amber-400" : "text-white/20"}`} />
                  ))}
                </div>
                <p className="text-sm text-slate-200 flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/30 to-blue-600/30 border border-white/15 font-display font-bold text-sky-300">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── NEWSLETTER CTA ───────────────────────────────────── */}
      <section className="container-custom">
        <Reveal>
          <div className="glass-strong relative overflow-hidden rounded-3xl p-10 md:p-14 text-center">
            <FlyingPlane variant="takeoff" size={90} className="top-6 right-10" />
            <div className="max-w-xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                One email a week, <span className="text-sky-400">zero turbulence</span>
              </h2>
              <p className="text-muted-foreground mt-3">
                The week's biggest movements: new routes out of Zanzibar, airport delays worth knowing, and the
                occasional radar oddity.
              </p>
              {subscribed ? (
                <div className="mt-6 glass rounded-2xl px-6 py-4 text-emerald-400 font-medium inline-flex items-center gap-2">
                  <Zap className="h-4 w-4" /> You're on the list — check your inbox.
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (email.trim()) setSubscribed(true)
                  }}
                  className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                >
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 rounded-xl bg-white/5 border-white/15 h-12 px-4"
                  />
                  <Button type="submit" size="lg" className="gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/25">
                    <Send className="h-4 w-4" /> Subscribe
                  </Button>
                </form>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
