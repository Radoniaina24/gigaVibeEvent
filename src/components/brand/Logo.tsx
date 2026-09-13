import { useId } from 'react';
import { cn } from '../../lib/utils';
import { env } from '../../app/config/env';

/**
 * Logotype original Ticket : souche perforée inclinée + étoile or
 * sur fond dégradé rouge passion. Dessiné à la main (aucune banque d'icônes).
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `ticket-grad-${rawId}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`Logo ${env.appName}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${gradId})`} />
      <g transform="rotate(-8 24 24)">
        {/* Souche avec encoches latérales */}
        <path
          d="M9,17 H39 V21.5 A2.5 2.5 0 0 0 39,26.5 V31 H9 V26.5 A2.5 2.5 0 0 0 9,21.5 Z"
          fill="#ffffff"
        />
        {/* Pointillés de détachable */}
        <line
          x1="28.5"
          y1="19"
          x2="28.5"
          y2="29"
          stroke="#dc2626"
          strokeWidth="1.4"
          strokeDasharray="2 2.2"
          strokeLinecap="round"
        />
        {/* Fausses lignes de texte */}
        <line x1="13" y1="22" x2="22" y2="22" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
        <line x1="13" y1="26" x2="19" y2="26" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
        {/* Étoile or */}
        <path
          d="M0,-4 L0.9,-1.23 L3.8,-1.24 L1.45,0.47 L2.35,3.24 L0,1.52 L-2.35,3.24 L-1.45,0.47 L-3.8,-1.24 L-0.9,-1.23 Z"
          transform="translate(34 24)"
          fill="#fbbf24"
        />
      </g>
    </svg>
  );
}

export function Logo({
  size = 36,
  tagline = true,
  className,
}: {
  size?: number;
  tagline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className="leading-none">
        <span className="block font-display text-lg font-bold tracking-tight">
          {env.appName}
        </span>
        {tagline && (
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 sm:block">
            Événements · MG
          </span>
        )}
      </span>
    </span>
  );
}
