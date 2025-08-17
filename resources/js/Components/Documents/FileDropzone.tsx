import React, { useCallback } from 'react';

// Comments in English only
type Props = {
  onFileSelected: (file: File) => void;
  accept?: string;           // comma separated extensions, e.g. ".pdf,.docx"
  maxSizeBytes?: number;     // e.g., 25 * 1024 * 1024
};

export const FileDropzone: React.FC<Props> = ({ onFileSelected, accept, maxSizeBytes }) => {
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;

    if (maxSizeBytes && f.size > maxSizeBytes) {
      alert('File too large');
      return;
    }
    if (accept) {
      const allowed = accept.split(',').map(s => s.trim().toLowerCase());
      const name = f.name.toLowerCase();
      const ok = allowed.some(ext => name.endsWith(ext));
      if (!ok) {
        alert('File type not allowed');
        return;
      }
    }
    onFileSelected(f);
  }, [onFileSelected, accept, maxSizeBytes]);

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (maxSizeBytes && f.size > maxSizeBytes) {
      alert('File too large');
      return;
    }
    if (accept) {
      const allowed = accept.split(',').map(s => s.trim().toLowerCase());
      const name = f.name.toLowerCase();
      const ok = allowed.some(ext => name.endsWith(ext));
      if (!ok) {
        alert('File type not allowed');
        return;
      }
    }
    onFileSelected(f);
  }, [onFileSelected, accept, maxSizeBytes]);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="border-2 border-dashed rounded-md p-6 text-center hover:bg-muted cursor-pointer"
      onClick={() => document.getElementById('file-input')?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('file-input')?.click(); } }}
    >
      <p className="text-sm">Drag & drop a file here, or click to select</p>
      <input
        id="file-input"
        type="file"
        className="hidden"
        onChange={onPick}
        accept={accept}
      />
    </div>
  );
};
