import type { SVGProps } from "react";
import type { Species } from "@/lib/api";

/**
 * Sheep/goat glyphs from Griddy Icons (MIT license,
 * https://github.com/griddy-icons/griddy-icons), used in place of lucide's
 * generic paw-print/rabbit stand-ins since lucide has no farm-animal icons.
 */

export function SheepIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M9 15a1 1 0 1 0 0-2a1 1 0 0 0 0 2m7-1a1 1 0 1 1-2 0a1 1 0 0 1 2 0" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2a4.96 4.96 0 0 0-2.621.749A4 4 0 0 0 8 2.5a3.996 3.996 0 0 0-3.953 3.415A3.746 3.746 0 0 0 2.912 11.7l-1.544 4.38a1.25 1.25 0 0 0 1.531 1.615l3.014-.886l.372 1.55A4.75 4.75 0 0 0 10.904 22h2.193a4.75 4.75 0 0 0 4.618-3.642l.373-1.55l3.013.886a1.25 1.25 0 0 0 1.531-1.615L21.087 11.7a3.74 3.74 0 0 0-1.134-5.786A3.996 3.996 0 0 0 16 2.5c-.487 0-.951.09-1.379.249A4.96 4.96 0 0 0 12 2m7.832 10.65a3.7 3.7 0 0 1-.812.27l-.582 2.427l2.617.77zm-2.354.27a3.73 3.73 0 0 1-1.964-1.126c-1.02.45-2.228.706-3.514.706s-2.493-.255-3.512-.705a3.7 3.7 0 0 1-1.966 1.125l1.221 5.088a3.25 3.25 0 0 0 3.16 2.492h.347v-.94l-1.28-1.28l1.06-1.06l.97.97l.97-.97l1.06 1.06l-1.28 1.28v.94h.347a3.25 3.25 0 0 0 3.16-2.492l1.221-5.089Zm-12.498 0a3.7 3.7 0 0 1-.812-.27l-1.223 3.467l2.617-.77l-.582-2.426Zm4.929-8.719A3.48 3.48 0 0 1 12 3.5c.784 0 1.503.262 2.091.701l.37.277l.414-.207A2.5 2.5 0 0 1 16 4a2.497 2.497 0 0 1 2.495 2.442l.012.52l.49.17A2.24 2.24 0 0 1 20.5 9.25c0 1.24-1.01 2.25-2.25 2.25c-.79 0-1.485-.418-1.887-1.052l-.38-.598l-.618.345C14.483 10.687 13.31 11 12 11s-2.483-.313-3.365-.805l-.62-.346l-.38.6A2.22 2.22 0 0 1 5.75 11.5c-1.24 0-2.25-1.01-2.25-2.25c0-.975.628-1.81 1.504-2.118l.489-.172l.012-.518A2.497 2.497 0 0 1 8 4c.4 0 .78.099 1.125.27l.413.208l.37-.277Z"
      />
    </svg>
  );
}

export function GoatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8.5 13.5a1 1 0 1 0 0-2a1 1 0 0 0 0 2m8-1a1 1 0 1 1-2 0a1 1 0 0 1 2 0" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 2.5h1.25c.69 0 1.25.56 1.25 1.25v.809A4.75 4.75 0 0 0 4.506 9H1v1.25A2.75 2.75 0 0 0 3.75 13h.767a4.75 4.75 0 0 0 1.374 2.952l1.11 1.109a5 5 0 0 0 9.999 0l1.109-1.11A4.75 4.75 0 0 0 19.483 13h.767A2.75 2.75 0 0 0 23 10.25V9h-3.506A4.75 4.75 0 0 0 15.5 4.559V3.75c0-.69.56-1.25 1.25-1.25H18V1h-1.25A2.75 2.75 0 0 0 14 3.75v.75h-4v-.75A2.75 2.75 0 0 0 7.25 1H6zm-1.5 9v-1H2.525c.116.57.62 1 1.225 1zm15.75 0h-.75v-1h1.975c-.116.57-.62 1-1.225 1M9.97 17.53l1.06-1.06l.97.97l.97-.97l1.06 1.06l-1.28 1.28v1.61A3.5 3.5 0 0 0 15.5 17v-.56l1.548-1.549A3.25 3.25 0 0 0 18 12.593V9.25A3.25 3.25 0 0 0 14.75 6h-5.5A3.25 3.25 0 0 0 6 9.25v3.343c0 .862.342 1.689.952 2.298L8.5 16.44V17a3.5 3.5 0 0 0 2.75 3.42v-1.61z"
      />
    </svg>
  );
}

export function SpeciesIcon({
  species,
  className,
}: {
  species: Species;
  className?: string;
}) {
  return species === "SHEEP" ? (
    <SheepIcon className={className} />
  ) : (
    <GoatIcon className={className} />
  );
}
