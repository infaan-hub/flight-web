import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
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
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/flights" element={<AllFlights />} />
              <Route path="/flights/:flightNumber" element={<FlightDetail />} />
              <Route path="/search" element={<FlightSearch />} />
              <Route path="/radar" element={<LiveRadar />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="border-t py-6 mt-12">
          <div className="container-custom text-center text-sm text-muted-foreground">
            <p>SkyTrack - Flight Information System | Powered by Django & React</p>
            <p className="text-xs mt-1">Data sourced from OpenSky Network & AviationStack APIs</p>
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
