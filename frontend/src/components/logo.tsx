export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2.6" />

      {/* Sheep, left: woolly cap made of overlapping circles + round face */}
      <circle cx="21" cy="38" r="7" stroke="currentColor" strokeWidth="2.3" />
      <circle cx="30" cy="31" r="8" stroke="currentColor" strokeWidth="2.3" />
      <circle cx="40" cy="35" r="7" stroke="currentColor" strokeWidth="2.3" />
      <circle cx="30" cy="47" r="11.5" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M19 50 Q13 49 14 43"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="35" cy="44" r="1.8" fill="currentColor" />

      {/* Goat, right: rounded face + swept-back ridged horn + small ear */}
      <ellipse
        cx="68"
        cy="51"
        rx="12.5"
        ry="14.5"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M64 38
           C59 27 64 14 78 12
           C83 22 76 27 68 39"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M67 25 L74 22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M65 31 L72 28" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M79 46 L85 43"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="72" cy="47" r="1.8" fill="currentColor" />

      {/* Wave lines beneath both heads */}
      <path
        d="M14 74 Q25 68 36 74 T58 74 T82 74"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 82 Q29 76 40 82 T62 82 T84 82"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
