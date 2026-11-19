import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bespoke line pictographs instead of generic icon-set shapes. One stroke
 * weight, one 32px grid, so the set reads as a family rather than clip art.
 */
function Glyph({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-7 w-7", className)}
    >
      {children}
    </svg>
  );
}

export function SellerGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M5 13 7.5 5h17L27 13" />
      <path d="M5 13a2.75 2.75 0 0 0 5.5 0 2.75 2.75 0 0 0 5.5 0 2.75 2.75 0 0 0 5.5 0 2.75 2.75 0 0 0 5.5 0" />
      <path d="M7 16v11h18V16" />
      <path d="M12 27v-6h8v6" />
    </Glyph>
  );
}

export function CompanyGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M4 27V9l8-4v22" />
      <path d="M12 27V13l9 4v10" />
      <path d="M21 27V11l6 3v13" />
      <path d="M7 11h2M7 15h2M7 19h2M7 23h2M16 18h2M16 22h2" />
    </Glyph>
  );
}

export function FashionGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M18.5 7.5a2.5 2.5 0 1 1 2.5-2.5" />
      <path d="M18 8.5 16 10" />
      <path d="m6 20 10-8 10 8" />
      <path d="M11 20h10l-1.5 7h-7L11 20Z" />
    </Glyph>
  );
}

export function EventGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M5 9h22v5.5a2.5 2.5 0 0 0 0 5V24H5v-4.5a2.5 2.5 0 0 0 0-5V9Z" />
      <path d="M20 10v3M20 17v2M20 22v1" strokeDasharray="1.5 3" />
      <path d="m11 13.5 1.1 2.6 2.6 1.1-2.6 1.1L11 20.9l-1.1-2.6-2.6-1.1 2.6-1.1L11 13.5Z" />
    </Glyph>
  );
}

export function MoMoGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="9" y="3" width="14" height="26" rx="3" />
      <path d="M14 7h4" />
      <path d="M17.5 12.5c-1.7-.9-3.7-.3-3.7 1.4 0 1.6 2 1.8 3.4 2.3 1.7.6 1.8 2.2.3 3-1.1.5-2.6.4-3.7-.2" />
      <path d="M16.5 10.5V22" />
    </Glyph>
  );
}

export function CardGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="4" y="8" width="24" height="17" rx="3" />
      <path d="M4 13.5h24" />
      <path d="M8 20h5" />
      <path d="M23 18.5v3M21.5 20h3" />
    </Glyph>
  );
}

export function BankGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="m4 12 12-7 12 7" />
      <path d="M6 12h20" />
      <path d="M8 16v8M13.3 16v8M18.7 16v8M24 16v8" />
      <path d="M5 27h22" />
    </Glyph>
  );
}

export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M27 15.5A11 11 0 0 1 10.8 25.7L5 27l1.4-5.6A11 11 0 1 1 27 15.5Z" />
      <path d="M12 11c.2 4.0 3.6 7.4 8 7.6l1.3-2.1-2.5-1.5-1.2 1a9.4 9.4 0 0 1-2.6-2.6l1-1.2L14.6 9.7 12 11Z" />
    </Glyph>
  );
}
