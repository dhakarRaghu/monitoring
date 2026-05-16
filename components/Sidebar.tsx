"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/journal", label: "Journal", icon: JournalIcon },
  { href: "/daily", label: "Daily Log", icon: CalendarIcon },
  { href: "/trends", label: "Trends", icon: TrendIcon },
  { href: "/achievements", label: "Achievements", icon: TrophyIcon },
  { href: "/insights", label: "Insights", icon: InsightIcon },
  { href: "/learn", label: "Learn Queue", icon: BookIcon },
  { href: "/study", label: "Study Materials", icon: GraduateIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] h-screen shrink-0 overflow-hidden bg-card/50 border-r border-card-border flex flex-col relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-10 w-40 h-40 bg-accent/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="relative p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-glow-strong flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary-light">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-foreground tracking-tight">AI Mentor</h1>
            <p className="text-[11px] text-foreground-tertiary">Growth Tracker</p>
          </div>
        </div>
      </div>

      <div className="relative px-3 pb-2">
        <div className="h-px bg-gradient-to-r from-transparent via-card-border to-transparent" />
      </div>

      <nav className="relative flex-1 px-3 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-primary/[0.12] text-primary-light shadow-[inset_0_1px_0_0_rgba(124,92,252,0.1)]"
                  : "text-foreground-secondary hover:text-foreground hover:bg-card-elevated/60"
              }`}
            >
              <Icon active={isActive} />
              <span className="tracking-[-0.01em]">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-light" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="relative px-3 pt-2">
        <div className="h-px bg-gradient-to-r from-transparent via-card-border to-transparent" />
      </div>

      <div className="relative p-4">
        <div className="rounded-xl bg-background-secondary/50 border border-card-border px-4 py-3">
          <p className="text-[11px] text-foreground-tertiary leading-relaxed">
            Run{" "}
            <code className="text-primary-light font-mono text-[10px] bg-primary-glow px-1.5 py-0.5 rounded">
              /mentor
            </code>{" "}
            to review sessions
          </p>
        </div>
      </div>
    </aside>
  );
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`transition-colors ${active ? "text-primary-light" : "text-foreground-tertiary group-hover:text-foreground-secondary"}`}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  );
}

function JournalIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`transition-colors ${active ? "text-primary-light" : "text-foreground-tertiary group-hover:text-foreground-secondary"}`}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`transition-colors ${active ? "text-primary-light" : "text-foreground-tertiary group-hover:text-foreground-secondary"}`}>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  );
}

function TrendIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`transition-colors ${active ? "text-primary-light" : "text-foreground-tertiary group-hover:text-foreground-secondary"}`}>
      <path d="M23 6l-9.5 9.5-5-5L1 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 6h6v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`transition-colors ${active ? "text-primary-light" : "text-foreground-tertiary group-hover:text-foreground-secondary"}`}>
      <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M6 3h12v7a6 6 0 01-12 0V3zM12 16v3M8 22h8M9 19h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function InsightIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`transition-colors ${active ? "text-primary-light" : "text-foreground-tertiary group-hover:text-foreground-secondary"}`}>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  );
}

function BookIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`transition-colors ${active ? "text-primary-light" : "text-foreground-tertiary group-hover:text-foreground-secondary"}`}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function GraduateIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`transition-colors ${active ? "text-primary-light" : "text-foreground-tertiary group-hover:text-foreground-secondary"}`}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
