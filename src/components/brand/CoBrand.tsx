import { BadgeCheck } from 'lucide-react';
import { LogoMark } from './Logo';
import { env } from '../../app/config/env';
import { cn } from '../../lib/utils';
import type { EventPartner } from '../../features/events/eventUtils';

export interface CoBrandPartner {
  name: string;
  logo_url: string | null;
}

/**
 * Co-branding Giga Vibe Event (§9-10 du CDC v2) :
 * [logo partenaire] présente … — Billetterie officielle GIGA VIBE EVENT.
 * L'identité GVE est rendue par la plateforme et ne peut être
 * ni supprimée ni modifiée par le partenaire.
 */
export function GveOfficialLine({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold',
        dark ? 'text-zinc-300' : 'text-zinc-500',
      )}
    >
      <LogoMark size={16} />
      Billetterie officielle {env.appName}
      <BadgeCheck className="size-3.5 text-brand-600" aria-label="Plateforme vérifiée" />
    </span>
  );
}

function PartnerAvatar({ partner, size = 'size-8' }: { partner: CoBrandPartner; size?: string }) {
  if (partner.logo_url) {
    return (
      <img
        src={partner.logo_url}
        alt={`Logo ${partner.name}`}
        className={cn('shrink-0 rounded-full border border-zinc-200 bg-white object-cover', size)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white',
        size,
      )}
    >
      {partner.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

/**
 * Bloc « Organisé par [partenaire] » + mention GVE.
 * Si aucun partenaire : simple mention GVE (événement direct).
 */
export function OrganizedBy({
  partner,
  fallbackOrganizer,
  dark = false,
}: {
  partner: EventPartner | CoBrandPartner | null;
  fallbackOrganizer?: string | null;
  dark?: boolean;
}) {
  if (!partner) {
    return (
      <div className="space-y-1">
        {fallbackOrganizer && (
          <p className={cn('text-sm', dark ? 'text-zinc-300' : 'text-zinc-600')}>
            Organisé par <strong className={dark ? 'text-white' : 'text-zinc-900'}>{fallbackOrganizer}</strong>
          </p>
        )}
        <GveOfficialLine dark={dark} />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <p className={cn('flex items-center gap-2 text-sm', dark ? 'text-zinc-200' : 'text-zinc-700')}>
        <PartnerAvatar partner={partner} />
        <span>
          <span className={cn('block text-[11px] uppercase tracking-wider', dark ? 'text-zinc-400' : 'text-zinc-400')}>
            Organisé par
          </span>
          <strong className={cn('leading-tight', dark ? 'text-white' : 'text-zinc-900')}>
            {partner.name}
          </strong>
        </span>
      </p>
      <GveOfficialLine dark={dark} />
    </div>
  );
}
