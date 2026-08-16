export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" />

      {/* Sheep, left: woolly cap made of overlapping circles + round face */}
      <circle cx="21" cy="38" r="7" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="30" cy="32" r="8" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="40" cy="35" r="7" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="30" cy="46" r="11" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="20" cy="48" r="3.5" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="34" cy="43" r="1.8" fill="currentColor" />

      {/* Goat, right: angular face + swept-back horn */}
      <ellipse
        cx="68"
        cy="50"
        rx="12"
        ry="14"
        stroke="currentColor"
        strokeWidth="2.6"
      />
      <path
        d="M66 37
           C62 27 68 17 79 18
           C81 26 74 30 68 38"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M78 45 L84 42"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="71" cy="46" r="1.8" fill="currentColor" />

      {/* Wave / terrain lines beneath both heads */}
      <path
        d="M16 74 Q27 68 38 74 T60 74 T84 74"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 82 Q31 76 42 82 T64 82 T86 82"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
