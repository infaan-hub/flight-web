import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import PageHero from "../components/ui/PageHero"
import GlassCard from "../components/ui/GlassCard"
import AnimatedSection from "../components/ui/AnimatedSection"
import AnimatedHeading from "../components/ui/AnimatedHeading"
import RadarLoader from "../components/ui/RadarLoader"
import CountUp from "../components/CountUp"
import { getFlightStats, getLiveFlights, getAirports } from "../services/api"
import type { FlightStats, LiveFlight, Airport } from "../types"
import {
  Plane,
  TrendingUp,
  Clock,
  AlertTriangle,
  Globe2,
  Building2,
  Gauge,
  MapPin,
  Radio,
  ArrowUpRight,
  CalendarClock,
  Landmark,
} from "lucide-react"

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<FlightStats | null>(null)
  const [flights, setFlights] = useState<LiveFlight[]>([])
  const [airports, setAirports] = useState<Airport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getFlightStats(), getLiveFlights(), getAirports()])
      .then(([s, f, a]) => {
        setStats(s)
        setFlights(f)
        setAirports(a)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <RadarLoader label="Pulling live network data" className="min-h-[70vh]" />
  }

  const inAir = flights.filter((f) => !f.on_ground)
  const topCountries = Object.entries(
    flights.reduce<Record<string, number>>((acc, f) => {
      if (f.origin_country) acc[f.origin_country] = (acc[f.origin_country] || 0) + 1
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxCountry = topCountries[0]?.[1] || 1

  const statCards = [
    { key: "today", label: "Flights today", value: stats?.total_flights_today ?? 0, icon: Plane, tint: "text-sky-300 bg-sky-400/10 border-sky-400/20" },
    { key: "air", label: "Now airborne", value: stats?.flights_in_air ?? inAir.length, icon: TrendingUp, tint: "text-green-300 bg-green-400/10 border-green-400/20" },
    { key: "delayed", label: "Delayed", value: stats?.flights_delayed ?? 0, icon: Clock, tint: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
    { key: "cancelled", label: "Canceled", value: stats?.flights_cancelled ?? 0, icon: AlertTriangle, tint: "text-red-300 bg-red-400/10 border-red-400/20" },
  ]

  const overviewRows = [
    { label: "Airports on the network", value: String(stats?.total_airports ?? airports.length), icon: Landmark },
    { label: "Airlines served", value: stats?.total_airlines ? String(stats.total_airlines) : "—", icon: Building2 },
    { label: "Busiest hour", value: stats?.busiest_hour || "—", icon: CalendarClock },
    { label: "Average delay", value: stats?.average_delay_minutes != null ? `${stats.average_delay_minutes} min` : "—", icon: Gauge },
    { label: "Airborne (live feed)", value: String(inAir.length), icon: Radio },
    { label: "On ground (live feed)", value: String(flights.length - inAir.length), icon: Plane },
  ]

  return (
    <>
      <PageHero
        kicker="Command Center"
        title={
          <>
            Global <span className="text-gradient-sky">Aviation</span> Dashboard
          </>
        }
        description="Every flight, every airport, every delay — distilled into one live operational view of the planet."
        video="landingTracks"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-green-400/25 bg-green-400/10 px-4 py-1.5 text-xs font-semibold text-green-300 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            {inAir.length} airborne right now
          </span>
          <Link
            to="/radar"
            className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur transition hover:border-sky-400/40 hover:text-sky-300"
          >
            Open live radar
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </PageHero>

      <div className="container-custom space-y-16 py-16">
        <AnimatedSection>
          <AnimatedHeading kicker="Live pulse" accent="at a glance">
            The network,
          </AnimatedHeading>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((c, idx) => (
              <GlassCard key={c.key} maxTilt={4} className="p-5 md:p-6" >
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${c.tint}`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <p className="font-display text-3xl font-bold md:text-4xl">
                  <CountUp value={c.value} duration={1400 + idx * 150} />
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{c.label}</p>
              </GlassCard>
            ))}
          </div>
        </AnimatedSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <AnimatedSection>
            <GlassCard className="h-full p-6 md:p-8">
              <div className="flex items-center gap-2.5">
                <Globe2 className="h-5 w-5 text-sky-400" />
                <h3 className="font-display text-lg font-bold tracking-tight">Top countries by flights</h3>
              </div>
              {topCountries.length === 0 ? (
                <p className="mt-8 text-sm text-slate-400">No origin data in this feed yet.</p>
              ) : (
                <div className="mt-8 space-y-6">
                  {topCountries.map(([country, count], idx) => {
                    const pct = Math.round((count / maxCountry) * 100)
                    return (
                      <div key={country} className="flex items-center gap-3">
                        <span className="font-grotesk w-5 shrink-0 text-xs font-semibold text-slate-500">{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-medium text-slate-200">{country}</span>
                            <span className="font-grotesk shrink-0 font-semibold text-sky-300">{count}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${pct}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1, delay: 0.12 * idx, ease: [0.22, 1, 0.36, 1] }}
                              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </GlassCard>
          </AnimatedSection>

          <AnimatedSection delay={0.12}>
            <GlassCard className="h-full p-6 md:p-8">
              <div className="flex items-center gap-2.5">
                <Radio className="h-5 w-5 text-sky-400" />
                <h3 className="font-display text-lg font-bold tracking-tight">Network overview</h3>
              </div>
              <dl className="mt-8 divide-y divide-white/5">
                {overviewRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 py-3">
                    <dt className="flex items-center gap-2.5 text-sm text-slate-400">
                      <row.icon className="h-4 w-4 text-slate-500" />
                      {row.label}
                    </dt>
                    <dd className="font-grotesk text-sm font-semibold text-slate-100">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </GlassCard>
          </AnimatedSection>
        </div>

        {airports.length > 0 && (
          <AnimatedSection>
            <AnimatedHeading kicker="Worldwide network" accent="featured">
              Airports on the radar
            </AnimatedHeading>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {airports.slice(0, 8).map((apt) => (
                <GlassCard
                  key={apt.iata || apt.icao}
                  maxTilt={6}
                  className="group cursor-pointer p-5"
                  onClick={() => navigate(`/search?departure=${apt.iata || apt.icao}`)}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-display text-2xl font-bold tracking-tight text-slate-100">
                      {apt.iata || apt.icao}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {apt.country}
                    </span>
                  </div>
                  <p className="mt-3 truncate text-sm font-medium text-slate-200">{apt.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="h-3 w-3" />
                    {apt.city}
                  </p>
                  <p className="font-grotesk mt-4 text-[10px] font-medium uppercase tracking-[0.2em] text-transparent transition group-hover:text-sky-300">
                    View departures →
                  </p>
                </GlassCard>
              ))}
            </div>
          </AnimatedSection>
        )}
      </div>
    </>
  )
}
