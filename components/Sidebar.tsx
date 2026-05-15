"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/journal", label: "Journal", icon: "✍️" },
  { href: "/daily", label: "Daily Log", icon: "📅" },
  { href: "/trends", label: "Trends", icon: "📈" },
  { href: "/achievements", label: "Achievements", icon: "🏆" },
  { href: "/insights", label: "Insights", icon: "💡" },
  { href: "/learn", label: "Learn Queue", icon: "📚" },
  { href: "/study", label: "Study Materials", icon: "📖" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] min-h-screen bg-card border-r border-card-border flex flex-col">
      <div className="p-5 border-b border-card-border">
        <h1 className="text-lg font-semibold gradient-text">AI Mentor</h1>
        <p className="text-xs text-foreground-tertiary mt-0.5 tracking-wide">
          Developer Growth Tracker
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-primary-glow-strong text-primary-light shadow-sm"
                  : "text-foreground-secondary hover:text-foreground hover:bg-card-elevated"
              }`}
            >
              <span className="text-sm w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-card-border">
        <div className="bg-primary-glow rounded-lg px-3 py-2.5">
          <p className="text-[11px] text-foreground-tertiary leading-relaxed">
            Use{" "}
            <code className="text-primary-light font-medium">/mentor</code>{" "}
            to review sessions
          </p>
        </div>
      </div>
    </aside>
  );
}
