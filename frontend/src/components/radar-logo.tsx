import { cn } from "@/lib/utils";

/**
 * Brand mark: three broadcast rings pulsing out from a center dot, echoing
 * the RFID scan the app is built around. Same art as the Android app icon.
 */
export function RadarLogo({
  size = 96,
  animated = false,
  className,
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 108 108"
      width={size}
      height={size}
      className={cn("radar-logo", animated && "radar-logo--animated", className)}
      role="img"
      aria-label="Хэнц Хурга"
    >
      <circle cx="54" cy="54" r="54" fill="#F2A93C" />
      <circle
        className="radar-logo__ring"
        cx="54"
        cy="54"
        r="14"
        fill="none"
        stroke="#1A1206"
        strokeWidth="4"
        style={{ animationDelay: "0ms" }}
      />
      <circle
        className="radar-logo__ring"
        cx="54"
        cy="54"
        r="14"
        fill="none"
        stroke="#1A1206"
        strokeWidth="4"
        style={{ animationDelay: "450ms" }}
      />
      <circle
        className="radar-logo__ring"
        cx="54"
        cy="54"
        r="14"
        fill="none"
        stroke="#1A1206"
        strokeWidth="4"
        style={{ animationDelay: "900ms" }}
      />
      <circle cx="54" cy="54" r="6" fill="#1A1206" />
    </svg>
  );
}
