// src/Components/Documents/UploadModal.tsx
// Upload modal for documents
// - French UI labels and messages
// - English-only comments
// - Extended allow-list aligned with backend validation
// - Accepts initialLinks to prefill LinkPicker (e.g., current company)
// - Returns upload result to parent via onUploaded

import React, { useMemo, useState, useEffect } from 'react';
import { FileDropzone } from './FileDropzone';
import { TagInput } from './TagInput';
import { LinkPicker } from './LinkPicker';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';

// Comments in English only

type Link = { type: 'company' | 'contact'; id: number; name: string; role?: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (created?: any) => void; // pass created doc back to parent
  searchCompanies: (q: string) => Promise<{ id: number; name: string }[]>;
  searchContacts: (q: string) => Promise<{ id: number; name: string }[]>;
  upload: (form: FormData) => Promise<any>;
  // NEW: prefilled links (e.g., current company)
  initialLinks?: Link[];
  // NEW: notify parent when links change (optional)
  onLinksChange?: (links: Link[]) => void;
};

export const UploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onUploaded,
  searchCompanies,
  searchContacts,
  upload,
  initialLinks = [],
  onLinksChange,
}) => {
  // Local states
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private'|'team'|'company'>('private');
  const [tags, setTags] = useState<string[]>([]);
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [submitting, setSubmitting] = useState(false);

  // Keep local links in sync if initialLinks changes while open (safety)
  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  // Extended allow-list for CRM-typical files
  const allowedMemo = [
    // Documents (PDF, Word/OpenDocument/RTF)
    '.pdf', '.doc', '.docx', '.rtf', '.odt',
    // Spreadsheets (Excel/OpenDocument/CSV)
    '.xls', '.xlsx', '.xlsm', '.ods', '.csv',
    // Presentations (PowerPoint/OpenDocument)
    '.ppt', '.pptx', '.odp',
    // Text notes / plain text
    '.txt', '.md',
    // Images (raster + vector)
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp', '.svg',
    // Simple archives (optional)
    '.zip',
  ];
  const allowed = useMemo(() => allowedMemo, []);

  // Reset all local states (called on success and on close)
  const resetForm = () => {
    setFile(null);
    setName('');
    setDescription('');
    setVisibility('private');
    setTags([]);
    setLinks(initialLinks);
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const submit = async () => {
    if (!file || submitting) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (name) form.append('name', name);
      if (description) form.append('description', description);
      if (visibility) form.append('visibility', visibility);
      // Tags
      tags.forEach((t, i) => form.append(`tags[${i}]`, t));
      // Links to companies/contacts (aligns with your StoreRequest)
      links.forEach((l, i) => {
        form.append(`links[${i}][type]`, l.type);
        form.append(`links[${i}][id]`, String(l.id));
        if (l.role) form.append(`links[${i}][role]`, l.role);
      });

      // Perform upload via injected callback
      const created = await upload(form);

      // Notify parent with created document object (if any)
      onUploaded(created);

      // Reset before closing to start clean on next open
      resetForm();
      onClose();
    } catch {
      // Keep the modal open to let user retry; do not reset file/name
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : null)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Téléverser un document</DialogTitle>
          <DialogDescription>Déposez un fichier, ajoutez les informations et les liens, puis validez.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FileDropzone
            onFileSelected={(f) => { setFile(f); setName(f.name.replace(/\.[^/.]+$/, '')); }}
            accept={allowed.join(',')}
            maxSizeBytes={25 * 1024 * 1024} // 25MB
            className="bg-white"
          />

          {/* Name + Visibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Nom</label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Visibilité</label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                <SelectTrigger><SelectValue placeholder="Visibilité" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privé</SelectItem>
                  <SelectItem value="team">Équipe</SelectItem>
                  <SelectItem value="company">Entreprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              className="w-full border rounded-md p-2 text-sm bg-white"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm mb-1">Tags</label>
            <TagInput value={tags} onChange={setTags} />
          </div>

          {/* Links */}
          <div>
            <label className="block text-sm mb-1">Liens</label>
            <LinkPicker
              value={links}
              onChange={(v) => { setLinks(v); onLinksChange?.(v); }}
              searchCompanies={searchCompanies}
              searchContacts={searchContacts}
              minChars={2}
              debounceMs={300}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Annuler</Button>
            <Button disabled={!file || submitting} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white">
              {submitting ? 'Téléversement…' : 'Téléverser'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
