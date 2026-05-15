"use client";

interface MentorMessageProps {
  message: string | null;
}

export function MentorMessage({ message }: MentorMessageProps) {
  return (
    <div className="card p-5 flex flex-col">
      <h3 className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider mb-3">
        Mentor Message
      </h3>
      {message ? (
        <div className="flex-1 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-glow flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-sm">🧠</span>
          </div>
          <p className="text-sm text-foreground-secondary leading-relaxed">
            {message}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div className="w-12 h-12 rounded-2xl bg-card-elevated flex items-center justify-center mb-3">
            <span className="text-xl opacity-50">💬</span>
          </div>
          <p className="text-sm text-foreground-tertiary text-center max-w-[200px]">
            Complete your first{" "}
            <code className="text-primary-light text-xs">/review-day</code> to get
            personalized feedback
          </p>
        </div>
      )}
    </div>
  );
}
