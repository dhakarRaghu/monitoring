"use client";

interface MentorMessageProps {
  message: string | null;
}

export function MentorMessage({ message }: MentorMessageProps) {
  return (
    <div className="card p-5 flex flex-col">
      <h3 className="text-[11px] font-semibold text-foreground-tertiary uppercase tracking-widest mb-3">
        Mentor Message
      </h3>
      {message ? (
        <div className="flex-1 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-glow-strong flex items-center justify-center shrink-0 mt-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-primary-light">
              <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M9 21h6M10 17v-1.5M14 17v-1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-[13px] text-foreground-secondary leading-relaxed">
            {message}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-6">
          <div className="w-12 h-12 rounded-2xl bg-card-elevated flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-foreground-tertiary opacity-50">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[13px] text-foreground-tertiary text-center max-w-[200px]">
            Complete your first{" "}
            <code className="text-primary-light font-mono text-[11px]">/review-day</code> to get
            personalized feedback
          </p>
        </div>
      )}
    </div>
  );
}
