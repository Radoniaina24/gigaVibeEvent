import { useState } from 'react';
import { cn } from '../../lib/utils';

interface Props {
  src: string;
  label: string;
  /** Pastille de repli (initiale) si le logo ne charge pas. */
  initial: string;
  bg: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Logo opérateur (YAS / Orange / Airtel) auto-hébergé dans /public/operators.
 * Repli automatique sur la pastille initiale si le fichier est absent.
 */
export function OperatorLogo({ src, label, initial, bg, className, imgClassName }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        aria-label={label}
        role="img"
        style={{ backgroundColor: bg }}
        className={cn(
          'flex items-center justify-center font-black text-white',
          className,
        )}
      >
        {initial}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={label}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-contain', imgClassName ?? className)}
    />
  );
}
