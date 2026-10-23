export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup" aria-label="Echo home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      {!compact && <span className="brand-name">echo</span>}
    </div>
  );
}
