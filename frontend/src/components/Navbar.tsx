import { Link, useLocation } from "react-router-dom"
import { cn } from "../lib/utils"
import { Plane, Search, Radar, LayoutDashboard, Home } from "lucide-react"

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/flights", label: "Flights", icon: Plane },
  { path: "/search", label: "Search", icon: Search },
  { path: "/radar", label: "Live Radar", icon: Radar },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
]

export default function Navbar() {
  const location = useLocation()

  return (
    <header className="sticky top-3 z-50 w-full px-3">
      <div className="container-custom">
        <div className="glass-strong flex h-14 items-center justify-between rounded-2xl px-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/25 transition-transform group-hover:scale-105">
              <Plane className="h-5 w-5 text-white -rotate-12" />
            </span>
            <span className="font-display font-bold text-lg tracking-tight">
              Zanflight<span className="text-sky-400">GO</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  location.pathname === item.path
                    ? "bg-sky-400/15 text-sky-300 shadow-inner"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
