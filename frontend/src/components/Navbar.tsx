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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-custom flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Plane className="h-6 w-6 text-primary" />
          <span>SkyTrack</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
