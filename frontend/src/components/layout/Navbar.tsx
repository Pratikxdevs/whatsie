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
  PlusCircleIcon,
  LogOut,
  Settings,
  User,
  CreditCard,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
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

export function Search({ className }: React.ComponentProps<"button">) {
  const isMac =
    typeof window !== "undefined" &&
    navigator.platform.toUpperCase().includes("MAC")

  return (
    <Button
      variant="secondary"
      className={cn(
        "bg-zinc-900 text-zinc-400 relative h-8 w-full justify-start pl-2.5 font-normal shadow-none sm:pr-12 md:w-40 lg:w-56 xl:w-64",
        className
      )}
    >
      <span className="hidden lg:inline-flex">Search...</span>
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
  )
}

const defaultTeams = [
  { id: "team-1", name: "Acme Corp" },
  { id: "team-2", name: "Demo Team" },
]

export function TeamSwitcher() {
  const [team, setTeam] = React.useState(defaultTeams[0])
  const [open, setOpen] = React.useState(false)

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
          <div className="h-5 w-5 shrink-0 rounded-full bg-green-500" />
          <p className="truncate text-sm text-zinc-200">{team.name}</p>
          <ChevronsUpDownIcon className="h-4 w-4 text-zinc-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 bg-zinc-900 border-white/10" align="start">
        <Command>
          <CommandInput placeholder="Search team..." />
          <CommandList>
            <CommandEmpty>No team found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-y-auto">
              {defaultTeams.map((t) => (
                <CommandItem
                  key={t.id}
                  value={t.id}
                  onSelect={(currentValue) => {
                    setTeam(
                      defaultTeams.find((x) => x.id === currentValue) ||
                        defaultTeams[0]
                    )
                    setOpen(false)
                  }}
                  className="flex items-center gap-3"
                >
                  <div className="h-5 w-5 rounded-full bg-green-500" />
                  <span className="flex-1 text-zinc-200">{t.name}</span>
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      team.id === t.id ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem className="flex items-center gap-2">
                <PlusCircleIcon className="h-4 w-4" />
                <span>Create new team</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function UserProfileDropdown() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-green-500/50 h-8 w-8"
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
            className="flex items-center cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate("/billing")}
            className="flex items-center cursor-pointer"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate("/settings")}
            className="flex items-center cursor-pointer"
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
  { href: "/team", label: "Team" },
]

export default function Navbar() {
  const location = useLocation()

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
              <rect width="40" height="40" rx="8" fill="#22c55e" fillOpacity="0.15" />
              <path
                d="M12 20h16M20 12v16"
                stroke="#22c55e"
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

          <Separator
            orientation="vertical"
            className="hidden data-[orientation=vertical]:h-5 bg-white/5 md:flex"
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
