import React, { useEffect, useState } from 'react';
import { Button } from '@/Components/ui/button';

type Doc = {
  id: number;
  name: string;
  original_filename: string;
  mime_type: string;
  extension?: string | null;
  size_bytes: number;
};
type Props = { document: Doc };

export const DocumentPreview: React.FC<Props> = ({ document }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  // Guess PDF and image formats
  const isPDF = () =>
    (document.extension || '').toLowerCase() === 'pdf' ||
    document.mime_type === 'application/pdf';

  const isImage = () =>
    ['png','jpg','jpeg','gif','webp'].includes((document.extension || '').toLowerCase()) ||
    document.mime_type.startsWith('image/');

  // Fetch preview URL (signed S3 url or direct stream endpoint)
  useEffect(() => {
    let active = true;
    setLoading(true);
    setImgError(false);

    (async () => {
      try {
        const resp = await fetch(`/api/documents/${document.id}/preview`, { credentials: 'include' });
        const ct = resp.headers.get('content-type') || '';
        // S3: returns JSON with a url, local: direct streaming endpoint
        if (ct.includes('application/json')) {
          const json = await resp.json();
          if (json?.url && active) {
            setPreviewUrl(json.url);
            setLoading(false);
            return;
          }
        }
        if (active) {
            setPreviewUrl(`/api/documents/${document.id}/preview?t=${Date.now()}`);
          setLoading(false);
        }
      } catch {
        if (active) {
          setPreviewUrl(null);
          setLoading(false);
        }
      }
    })();

    return () => { active = false; };
  }, [document.id]);

  // Loading state
  if (loading) {
    return (
      <div className="h-[420px] flex items-center justify-center text-sm text-gray-500">
        Chargement de l’aperçu…
      </div>
    );
  }

  // Failed to get preview
  if (!previewUrl) {
    return (
      <div className="h-[420px] flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
        Impossible d’afficher l’aperçu.
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/documents/${document.id}/preview`, '_blank')}>
            Ouvrir
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/documents/${document.id}/download`, '_blank')}>
            Télécharger
          </Button>
        </div>
      </div>
    );
  }

  // Render PDF preview
  if (isPDF()) {
    return (
      <div className="w-full h-[420px] border rounded overflow-hidden bg-gray-50">
        <iframe
          src={previewUrl}
          title={document.name}
          className="w-full h-full"
          style={{ border: 'none', background: '#f9f9f9' }}
        />
      </div>
    );
  }

  // Render image preview (with fallback on error)
  if (isImage()) {
    return (
      <div className="w-full h-[420px] flex items-center justify-center bg-gray-50 overflow-hidden rounded">
        {!imgError ? (
          <img
            src={previewUrl}
            className="object-contain max-h-[420px] w-auto"
            alt={document.original_filename}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-gray-500 gap-2">
            Impossible d’afficher l’image.
            <Button variant="outline" size="sm" onClick={() => window.open(previewUrl, '_blank')}>
              Ouvrir dans un onglet
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Other files, just show filename and download/open
  return (
    <div className="h-[420px] flex flex-col items-center justify-center text-sm text-gray-600 gap-3">
      <div className="text-center">
        Aucun aperçu disponible pour ce type de fichier.
        <div className="text-xs text-gray-500 mt-1">{document.original_filename}</div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => window.open(previewUrl, '_blank')}>
          Ouvrir
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.open(`/api/documents/${document.id}/download`, '_blank')}>
          Télécharger
        </Button>
      </div>
    </div>
  );
};
