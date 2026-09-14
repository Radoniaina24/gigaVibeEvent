import { cn } from '../../lib/utils';
import { env } from '../../app/config/env';

/**
 * Nouveau logotype Giga Vibe Event (D:\logo.jpeg copié vers /public/logo.jpeg).
 * Le visuel contient déjà « GV + Giga Vibe Event + Vivez l'expérience ultime »,
 * on affiche donc uniquement l'image (pas de texte en double).
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.jpeg"
      alt={`Logo ${env.appName}`}
      height={size}
      width={Math.round(size * 2.8)}
      style={{ height: size, width: 'auto' }}
      className={cn('rounded-md bg-white object-contain', className)}
    />
  );
}

export function Logo({
  size = 36,
  className,
}: {
  size?: number;
  /** Conservé pour compatibilité (le slogan est déjà inclus dans l'image). */
  tagline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('flex items-center', className)}>
      <img
        src="/logo.jpeg"
        alt={env.appName}
        style={{ height: Math.round(size * 1.25), width: 'auto' }}
        className="rounded-md bg-white object-contain"
      />
      <span className="sr-only">{env.appName}</span>
    </span>
  );
}
