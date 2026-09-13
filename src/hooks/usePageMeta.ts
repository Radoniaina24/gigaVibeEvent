import { useEffect } from 'react';
import { env } from '../app/config/env';

/** SEO minimal pages publiques : title + meta description. */
export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = `${title} — ${env.appName}`;
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]',
      );
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);
}
