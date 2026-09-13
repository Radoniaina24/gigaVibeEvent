import { Ticket } from 'lucide-react';
import { cn } from '../../lib/utils';

function hueFromSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

interface Props {
  seed: string;
  imageUrl: string | null;
  title: string;
  className?: string;
}

/**
 * Image événement avec fallback dégradé déterministe
 * (les seeds n'ont pas toujours d'image uploadée).
 */
export function EventImage({ seed, imageUrl, title, className }: Props) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        className={cn('object-cover', className)}
      />
    );
  }
  const hue = hueFromSeed(seed);
  return (
    <div
      role="img"
      aria-label={title}
      className={cn('flex items-center justify-center', className)}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 45% 22%), hsl(${(hue + 50) % 360} 55% 38%))`,
      }}
    >
      <Ticket className="size-10 text-white/70" aria-hidden />
    </div>
  );
}
