import { BrowserRouter, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import AllFlights from "./pages/AllFlights"
import FlightSearch from "./pages/FlightSearch"
import FlightDetail from "./pages/FlightDetail"
import LiveRadar from "./pages/LiveRadar"
import Dashboard from "./pages/Dashboard"

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/flights" element={<AllFlights />} />
            <Route path="/flights/:flightNumber" element={<FlightDetail />} />
            <Route path="/search" element={<FlightSearch />} />
            <Route path="/radar" element={<LiveRadar />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
        <footer className="border-t py-6 mt-12">
          <div className="container-custom text-center text-sm text-muted-foreground">
            <p>SkyTrack - Flight Information System | Powered by Django & React</p>
            <p className="text-xs mt-1">Data sourced from OpenSky Network & AviationStack APIs</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
