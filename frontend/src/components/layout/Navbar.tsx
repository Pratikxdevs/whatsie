import * as React from "react"
import { cn } from "@/lib/utils"
import { buttonVariants, Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { Separator } from "@/components/ui/separator"
import {
  BellIcon,
  SlashIcon,
  ChevronsUpDownIcon,
  CheckIcon,
  LogOut,
  Settings,
  User,
  CreditCard,
  Paintbrush,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MobileNav } from "@/components/ui/navbar"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { botApi, leadApi } from "@/services/api"
import { socketManager } from "@/services/socketManager"

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function Search({ className }: React.ComponentProps<"button">) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [leads, setLeads] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const navigate = useNavigate()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (!query) {
      setLeads([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await leadApi.getLeads({ search: query })
        setLeads(data)
      } catch (err) {
        console.error("Search failed:", err)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const isMac =
    typeof window !== "undefined" &&
    navigator.platform.toUpperCase().includes("MAC")

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        className={cn(
          "bg-zinc-900 text-zinc-400 relative h-8 w-full justify-start pl-2.5 font-normal shadow-none sm:pr-12 md:w-40 lg:w-56 xl:w-64",
          className
        )}
      >
        <span className="hidden lg:inline-flex">Search leads...</span>
        <span className="inline-flex lg:hidden">Search...</span>

        <div className="absolute top-1.5 right-1.5 hidden gap-1 sm:flex">
          <kbd className="bg-zinc-800 text-zinc-500 pointer-events-none flex h-5 items-center justify-center rounded border border-zinc-700 px-1 font-sans text-[0.7rem] font-medium select-none">
            {isMac ? "\u2318" : "Ctrl"}
          </kbd>
          <kbd className="bg-zinc-800 text-zinc-500 pointer-events-none flex h-5 w-5 items-center justify-center rounded border border-zinc-700 px-1 font-sans text-[0.7rem] font-medium select-none">
            K
          </kbd>
        </div>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Type name, email, or phone to search..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="bg-zinc-950 border-white/5 text-zinc-200">
          {loading && (
            <div className="p-4 text-center text-sm text-zinc-500 flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              Searching leads...
            </div>
          )}
          {!loading && query && leads.length === 0 && (
            <CommandEmpty>No leads match your search.</CommandEmpty>
          )}
          {!loading && !query && (
            <div className="p-4 text-center text-sm text-zinc-500">
              Type to begin searching leads
            </div>
          )}
          {leads.length > 0 && (
            <CommandGroup heading="Leads">
              {leads.map((lead) => (
                <CommandItem
                  key={lead.id}
                  value={lead.name}
                  onSelect={() => {
                    setOpen(false)
                    navigate(`/leads?id=${lead.id}`)
                  }}
                  className="cursor-pointer hover:bg-zinc-800 text-zinc-200 flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{lead.name}</span>
                    <span className="text-[11px] text-zinc-500">{lead.phone || lead.email || "No contact info"}</span>
                  </div>
                  <span className="text-[10px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                    {lead.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}

export function TeamSwitcher() {
  const { user } = useAuth()
  const [tenantName, setTenantName] = React.useState("Acme Corp")
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const fetchTenantName = async () => {
      try {
        // @ts-expect-error — Clerk is injected globally
        const clerk = window.__clerk;
        if (clerk?.organization?.name) {
          setTenantName(clerk.organization.name);
          return;
        }
        if (clerk?.session) {
          const token = await clerk.session.getToken();
          if (token) {
            const decoded = decodeJwt(token);
            const name = decoded?.tenantName || decoded?.companyName || decoded?.org_name;
            if (name) {
              setTenantName(name);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Failed to decode token for tenantName:", err);
      }
      if (user?.companyName) {
        setTenantName(user.companyName);
      }
    };

    fetchTenantName();
  }, [user]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="hover:bg-zinc-800 max-w-[140px] cursor-pointer justify-start px-2 sm:max-w-[180px] flex items-center gap-2"
        >
          <div className="h-5 w-5 shrink-0 rounded-full bg-primary" />
          <p className="truncate text-sm text-zinc-200">{tenantName}</p>
          <ChevronsUpDownIcon className="h-4 w-4 text-zinc-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 bg-zinc-900 border-white/10" align="start">
        <Command className="bg-zinc-900 text-zinc-200">
          <CommandInput placeholder="Search team..." className="text-zinc-200 border-white/5" />
          <CommandList className="bg-zinc-900 text-zinc-200">
            <CommandEmpty>No team found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-y-auto">
              <CommandItem
                value="current"
                onSelect={() => setOpen(false)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="h-5 w-5 rounded-full bg-primary" />
                <span className="flex-1 text-zinc-200">{tenantName}</span>
                <CheckIcon className="ml-auto h-4 w-4 opacity-100" aria-hidden />
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const THEME_COLORS = [
  { name: "Emerald", value: "142 72% 29%" },
  { name: "Violet", value: "262.1 83.3% 57.8%" },
  { name: "Blue", value: "221.2 83.2% 53.3%" },
  { name: "Rose", value: "346.8 77.2% 49.8%" },
  { name: "Amber", value: "24.6 95% 53.1%" },
]

function ThemePicker() {
  const [, setActiveColor] = React.useState("142 72% 29%")

  React.useEffect(() => {
    const saved = localStorage.getItem("theme-color") || "142 72% 29%"
    setActiveColor(saved)
    document.documentElement.style.setProperty('--primary', saved)
    document.documentElement.style.setProperty('--ring', saved)
  }, [])

  const changeColor = (val: string) => {
    setActiveColor(val)
    localStorage.setItem("theme-color", val)
    document.documentElement.style.setProperty('--primary', val)
    document.documentElement.style.setProperty('--ring', val)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800 text-zinc-400">
          <Paintbrush className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-zinc-900 border-white/10">
        <DropdownMenuLabel className="text-zinc-400 text-xs">Choose Accent</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5" />
        {THEME_COLORS.map((color) => (
          <DropdownMenuItem
            key={color.name}
            onClick={() => changeColor(color.value)}
            className="flex items-center justify-between cursor-pointer text-zinc-300"
          >
            <span className="text-xs">{color.name}</span>
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: `hsl(${color.value})` }}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserProfileDropdown() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 h-8 w-8"
          aria-label="Open user menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatar-1.png" alt="User avatar" />
            <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-zinc-200">
              {user?.companyName || "User"}
            </p>
            <p className="text-xs leading-none text-zinc-500">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/5" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigate("/settings")}
            className="flex items-center cursor-pointer text-zinc-300 hover:text-zinc-100"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate("/billing")}
            className="flex items-center cursor-pointer text-zinc-300 hover:text-zinc-100"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate("/settings")}
            className="flex items-center cursor-pointer text-zinc-300 hover:text-zinc-100"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-white/5" />

        <DropdownMenuItem
          onClick={() => {
            logout()
            navigate("/login")
          }}
          className="flex items-center cursor-pointer text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const navigationLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/bots", label: "Bots" },
  { href: "/conversations", label: "Conversations" },
  { href: "/leads", label: "Leads" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
]

export default function Navbar() {
  const location = useLocation()
  const { user } = useAuth()
  const [botStatus, setBotStatus] = React.useState<"connected" | "offline">("offline")

  React.useEffect(() => {
    botApi.getWorkspaces()
      .then((bots) => {
        const hasConnected = bots.some(b => b.whatsapp_status === "connected")
        setBotStatus(hasConnected ? "connected" : "offline")
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (!user?.tenantId) return

    socketManager.connect(user.tenantId)

    const handleBotStatusChange = (payload: { botId: string; status: string }) => {
      if (payload.status === "connected") {
        setBotStatus("connected")
      } else {
        botApi.getWorkspaces().then((bots) => {
          const hasConnected = bots.some(b => b.whatsapp_status === "connected")
          setBotStatus(hasConnected ? "connected" : "offline")
        }).catch(() => {})
      }
    }

    socketManager.on('bot_status_change', handleBotStatusChange)
    return () => { socketManager.off('bot_status_change', handleBotStatusChange) }
  }, [user?.tenantId])

  return (
    <header className="border-white/5 w-full flex-col items-center justify-between gap-3 border-b px-4 xl:px-6 bg-zinc-950">
      <div className="flex w-full items-center justify-between gap-4 h-14">
        <div className="flex flex-1 items-center justify-start gap-2">
          <Link
            to="/dashboard"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "hover:bg-zinc-800 text-zinc-200 h-8 w-8"
            )}
          >
            <svg
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
            >
              <rect width="40" height="40" rx="8" className="fill-primary" fillOpacity="0.15" />
              <path
                d="M12 20h16M20 12v16"
                className="stroke-primary"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </Link>

          <SlashIcon className="hidden md:flex h-4 w-4 text-zinc-700 -rotate-[20deg]" />

          <MobileNav
            nav={[
              {
                name: "Menu",
                items: navigationLinks.map((l) => ({
                  ...l,
                  active: location.pathname === l.href,
                })),
              },
            ]}
          />

          <TeamSwitcher />
        </div>

        <div className="flex items-center justify-end gap-3 md:flex-1">
          <Search className="hidden md:flex" />

          {/* Bot Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-white/5 text-[10px] font-medium">
            <span className={cn("w-1.5 h-1.5 rounded-full", botStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-red-500")} />
            <span className="text-zinc-400 capitalize">Bot: {botStatus}</span>
          </div>

          <Separator
            orientation="vertical"
            className="hidden data-[orientation=vertical]:h-5 bg-white/5 md:flex"
          />

          <ThemePicker />

          <Separator
            orientation="vertical"
            className="hidden data-[orientation=vertical]:h-5 bg-white/5 sm:flex"
          />

          <div className="hidden items-center gap-1.5 sm:flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-zinc-800 text-zinc-400"
            >
              <BellIcon className="h-4 w-4" />
            </Button>
          </div>

          <Separator
            orientation="vertical"
            className="hidden data-[orientation=vertical]:h-5 bg-white/5 sm:flex"
          />

          <UserProfileDropdown />
        </div>
      </div>

      <div className="flex w-full items-center justify-start pb-1.5">
        <NavigationMenu className="max-md:hidden">
          <NavigationMenuList>
            {navigationLinks.map((link) => (
              <NavigationMenuItem key={link.href} asChild>
                <Link
                  to={link.href}
                  className={cn(
                    "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 flex rounded-md px-3 py-1.5 text-sm font-normal transition-all outline-none",
                    location.pathname === link.href &&
                      "text-zinc-200 bg-zinc-800/50"
                  )}
                >
                  {link.label}
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  )
}
