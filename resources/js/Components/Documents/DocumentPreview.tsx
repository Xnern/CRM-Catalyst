import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/Components/ui/button';
import type { Document } from '@/types/Document';

type Props = { document: Document | null };

// If your backend doesn't actually expose /preview, set this flag to false
const USE_PREVIEW_ENDPOINT = true;

export const DocumentPreview: React.FC<Props> = ({ document }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  // Guard: don't attempt anything until we have a document with an id
  const docId = document?.id;
  const ext = (document?.extension || '').toLowerCase();
  const mime = document?.mime_type || '';

  const isPDF = useMemo(
    () => ext === 'pdf' || mime === 'application/pdf',
    [ext, mime]
  );

  const isImage = useMemo(
    () =>
      ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) ||
      (typeof mime === 'string' && mime.startsWith('image/')),
    [ext, mime]
  );

  // Base URL (no call) according to flag
  const basePreviewPath = useMemo(() => {
    if (!docId) return null;
    const base = USE_PREVIEW_ENDPOINT
      ? `/api/documents/${docId}/preview`
      : `/api/documents/${docId}/download`;
    // cache-buster on updated_at to refresh preview
    const v = document?.updated_at ? `?v=${encodeURIComponent(document.updated_at)}` : '';
    return `${base}${v}`;
  }, [docId, document?.updated_at]);

  // Get preview URL (signed S3 URL JSON or direct stream)
  useEffect(() => {
    let active = true;

    // Without id, don't attempt anything
    if (!docId) {
      setPreviewUrl(null);
      setLoading(false);
      setImgError(false);
      return;
    }

    setLoading(true);
    setImgError(false);
    setPreviewUrl(null);

    (async () => {
      try {
        // If not using /preview endpoint, we can directly use basePreviewPath
        if (!USE_PREVIEW_ENDPOINT && basePreviewPath) {
          if (active) {
            setPreviewUrl(basePreviewPath);
            setLoading(false);
          }
          return;
        }

        // Otherwise, call /preview (which can return JSON {url} or direct stream)
        const resp = await fetch(`/api/documents/${docId}/preview`, { credentials: 'include' });
        const ct = resp.headers.get('content-type') || '';

        if (ct.includes('application/json')) {
          const json = await resp.json();
          if (json?.url && active) {
            setPreviewUrl(json.url);
            setLoading(false);
            return;
          }
        }

        // Direct stream: reuse the same local route
        if (active) {
          // Add cache-buster if updated_at exists
          const updated = document?.updated_at ? `?v=${encodeURIComponent(document.updated_at)}` : '';
          setPreviewUrl(`/api/documents/${docId}/preview${updated}`);
          setLoading(false);
        }
      } catch {
        if (active) {
          setPreviewUrl(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [docId, document?.updated_at, basePreviewPath]);

  // Loading
  if (loading) {
    return (
      <div className="h-[420px] flex items-center justify-center text-sm text-gray-500">
        Chargement de l'aperçu…
      </div>
    );
  }

  // No id => no preview
  if (!docId) {
    return (
      <div className="h-[420px] flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
        Aucun aperçu disponible.
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Ouvrir
          </Button>
          <Button variant="outline" size="sm" disabled>
            Télécharger
          </Button>
        </div>
      </div>
    );
  }

  // Failed (no URL)
  if (!previewUrl) {
    return (
      <div className="h-[420px] flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
        Impossible d'afficher l'aperçu.
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/documents/${docId}/preview`, '_blank')}
          >
            Ouvrir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/documents/${docId}/download`, '_blank')}
          >
            Télécharger
          </Button>
        </div>
      </div>
    );
  }

  // PDF
  if (isPDF) {
    return (
      <div className="w-full h-[420px] border rounded overflow-hidden bg-gray-50">
        <iframe
          src={previewUrl}
          title={document?.name || 'aperçu'}
          className="w-full h-full"
          style={{ border: 'none', background: '#f9f9f9' }}
        />
      </div>
    );
  }

  // Image (with fallback)
  if (isImage) {
    return (
      <div className="w-full h-[420px] flex items-center justify-center bg-gray-50 overflow-hidden rounded">
        {!imgError ? (
          <img
            src={previewUrl}
            className="object-contain max-h-[420px] w-auto"
            alt={document?.original_filename || document?.name || 'image'}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-gray-500 gap-2">
            Impossible d'afficher l'image.
            <Button variant="outline" size="sm" onClick={() => window.open(previewUrl, '_blank')}>
              Ouvrir dans un onglet
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Other files
  return (
    <div className="h-[420px] flex flex-col items-center justify-center text-sm text-gray-600 gap-3">
      <div className="text-center">
        Aucun aperçu disponible pour ce type de fichier.
        <div className="text-xs text-gray-500 mt-1">{document?.original_filename}</div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(previewUrl || `/api/documents/${docId}/preview`, '_blank')}
        >
          Ouvrir
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/api/documents/${docId}/download`, '_blank')}
        >
          Télécharger
        </Button>
      </div>
    </div>
  );
};
