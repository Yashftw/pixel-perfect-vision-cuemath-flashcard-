import { ReactNode } from "react";

export function PageHeader({
  tag, title, subtitle, icon, actions,
}: { tag: string; title: string; subtitle?: string; icon: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6">
      <span className="pill bg-brand-yellow mb-3">{tag}</span>
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-start gap-4">
          <div className="brutal-sm bg-brand-orange w-14 h-14 grid place-items-center shrink-0">
            {icon}
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionCard({
  title, subtitle, icon, color = "card", actions, children, className = "",
}: {
  title: string; subtitle?: string; icon?: ReactNode;
  color?: "card" | "purple" | "green" | "yellow" | "blue" | "orange";
  actions?: ReactNode; children: ReactNode; className?: string;
}) {
  const bg = {
    card: "bg-card", purple: "bg-brand-purple", green: "bg-brand-green",
    yellow: "bg-brand-yellow", blue: "bg-brand-blue", orange: "bg-brand-orange",
  }[color];
  return (
    <section className={`brutal ${bg} p-5 md:p-6 ${className}`}>
      <header className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          {icon && <div className="brutal-sm bg-card w-10 h-10 grid place-items-center">{icon}</div>}
          <div>
            <h2 className="font-display text-xl">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
