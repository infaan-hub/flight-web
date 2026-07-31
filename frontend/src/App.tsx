import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import Navbar from "./components/Navbar"
import Aurora from "./components/Aurora"
import CursorRing from "./components/CursorRing"
import { Loader2 } from "lucide-react"

const Home = lazy(() => import("./pages/Home"))
const AllFlights = lazy(() => import("./pages/AllFlights"))
const FlightSearch = lazy(() => import("./pages/FlightSearch"))
const FlightDetail = lazy(() => import("./pages/FlightDetail"))
const LiveRadar = lazy(() => import("./pages/LiveRadar"))
const Dashboard = lazy(() => import("./pages/Dashboard"))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Suspense fallback={<PageLoader />}>
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

function App() {
  return (
    <BrowserRouter>
      <div className="grain relative min-h-screen bg-background text-foreground">
        <Aurora />
        <CursorRing />
        <Navbar />
        <main className="relative z-10">
          <AnimatedRoutes />
        </main>
        <footer className="relative z-10 border-t border-white/10 mt-20 py-8">
          <div className="container-custom text-center text-sm text-muted-foreground">
            <p className="font-display font-semibold text-base text-foreground">
              Zanflight<span className="text-sky-400">GO</span>
            </p>
            <p className="text-xs mt-1">Powered by Django & React · Data from OpenSky Network & AviationStack APIs</p>
            <p className="text-xs mt-1">
              Statuses follow the standard flight lifecycle (Scheduled → Departed gate → In air → Landed → At
              gate). Positions are crowdsourced ADS-B and may be estimated or missing over oceans and remote
              regions.
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
