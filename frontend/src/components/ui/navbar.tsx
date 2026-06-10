import * as React from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  active?: boolean
}

interface NavGroup {
  name: string
  items: NavItem[]
}

interface MobileNavProps {
  nav: NavGroup[]
}

export function MobileNav({ nav }: MobileNavProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute top-14 left-0 right-0 z-50 bg-zinc-950 border-b border-white/5 p-4 shadow-lg">
          {nav.map((group) => (
            <div key={group.name}>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{group.name}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block px-3 py-2 rounded-md text-sm transition-colors",
                      item.active
                        ? "bg-zinc-800 text-zinc-200"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    )}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
