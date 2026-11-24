type MascotSlotProps = {
  /** Describes the animation that will fill this slot. */
  label: string;
  size: number;
};

/** Striped placeholder until the original mascot animations exist. */
export function MascotSlot({ label, size }: MascotSlotProps) {
  return (
    <div role="img" aria-label={label} className="mascot-slot" style={{ width: size, height: size }}>
      {label}
    </div>
  );
}
