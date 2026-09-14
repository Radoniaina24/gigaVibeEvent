import { useCallback, useEffect, useRef, useState } from 'react';
import { validateImageFile } from '../services/storage';

export interface ImageDraftResolve {
  /** Valeur actuelle du champ image_url du formulaire. */
  formUrl: string;
  /** Upload du fichier sélectionné (bucket admin ou partenaire). */
  upload: (file: File) => Promise<string>;
  /** Suppression de l'ancien fichier (best effort, ne doit pas bloquer). */
  destroy: (url: string) => Promise<unknown>;
}

export interface ImageDraftResult {
  url: string;
  /** `true` si l'ancien fichier n'a pas pu être supprimé du stockage. */
  cleanupFailed: boolean;
}

/**
 * Brouillon d'image pour les formulaires événement.
 *
 * - La sélection d'un fichier ne fait QUE un aperçu local (object URL) :
 *   rien n'est téléversé tant que l'utilisateur n'enregistre pas.
 *   Quitter sans enregistrer ne laisse donc aucun fichier orphelin.
 * - `resolveOnSave` téléverse le fichier en attente (ou supprime l'ancien
 *   si l'image a été retirée) — à appeler au début du `onSubmit`.
 */
export function useImageDraft(serverUrl: string | null | undefined) {
  const server = serverUrl ?? '';
  const [committed, setCommitted] = useState(server);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  // Synchronise l'URL enregistrée quand les données serveur arrivent,
  // sans écraser une sélection locale en cours.
  useEffect(() => {
    if (!previewRef.current) setCommitted(server);
  }, [server]);

  // Libère l'object URL au démontage.
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  /** Sélection locale : valide + prévisualise, sans aucun upload. */
  const select = useCallback((file: File): string | null => {
    try {
      validateImageFile(file);
    } catch (err) {
      return err instanceof Error ? err.message : 'Image invalide.';
    }
    const url = URL.createObjectURL(file);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreviewUrl(url);
    setPendingFile(file);
    return null;
  }, []);

  /** Abandonne la sélection locale (l'URL enregistrée est conservée). */
  const clear = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
    setPendingFile(null);
  }, []);

  /**
   * À appeler dans le `onSubmit` : téléverse le fichier en attente et
   * supprime l'ancien du stockage si remplacé/retiré. Lève une exception
   * uniquement si l'upload échoue (la suppression reste best effort).
   */
  const resolveOnSave = useCallback(
    async ({ formUrl, upload, destroy }: ImageDraftResolve): Promise<ImageDraftResult> => {
      let cleanupFailed = false;
      const destroyBestEffort = async (url: string) => {
        try {
          await destroy(url);
        } catch {
          cleanupFailed = true;
        }
      };
      if (pendingFile) {
        const url = await upload(pendingFile);
        if (committed && committed !== url) await destroyBestEffort(committed);
        clear();
        setCommitted(url);
        return { url, cleanupFailed };
      }
      if (!formUrl && committed) {
        await destroyBestEffort(committed);
        setCommitted('');
        return { url: '', cleanupFailed };
      }
      return { url: formUrl, cleanupFailed };
    },
    [pendingFile, committed, clear],
  );

  return {
    /** URL actuellement enregistrée en base (avant cet enregistrement). */
    committed,
    pendingFile,
    previewUrl,
    hasPending: pendingFile !== null,
    select,
    clear,
    resolveOnSave,
  };
}
