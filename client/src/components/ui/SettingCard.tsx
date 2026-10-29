interface Props {
  title: string;
  count?: number;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export default function SettingCard({ title, count, subtitle, headerRight, children }: Props) {
  return (
    <div className="bg-surface border border-border rounded-[20px] shadow-(--shadow-card) p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-extrabold text-text-primary">
            {title}
            {count !== undefined && (
              <span className="ml-2 text-xs font-semibold text-text-muted">{count} total</span>
            )}
          </h3>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}
