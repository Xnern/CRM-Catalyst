import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileDropzone } from './FileDropzone';
import { TagInput } from './TagInput';
import { LinkPicker } from './LinkPicker';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';

type Link = { type: 'company' | 'contact'; id: number; name: string; role?: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (created?: any) => void; // pass created doc back to parent
  searchCompanies: (q: string) => Promise<{ id: number; name: string }[]>;
  searchContacts: (q: string) => Promise<{ id: number; name: string }[]>;
  upload: (form: FormData) => Promise<any>;
  // Prefilled links (e.g., current company)
  initialLinks?: Link[];
  // Notify parent when links change (optional)
  onLinksChange?: (links: Link[]) => void;
};

const computeLinksSignature = (links: Link[] = []) =>
  JSON.stringify(
    [...links]
      .map(l => ({ type: l.type, id: l.id, name: l.name, role: l.role ?? null }))
      .sort((a, b) => (a.type === b.type ? a.id - b.id : a.type < b.type ? -1 : 1))
  );

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
  const [links, setLinks] = useState<Link[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable signature of initialLinks to compare content (not reference)
  const initialLinksSig = useMemo(() => computeLinksSignature(initialLinks), [initialLinks]);
  const prevInitialLinksSigRef = useRef<string>(initialLinksSig);
  const prevIsOpenRef = useRef<boolean>(isOpen);

  // Get allowed extensions from settings
  const appSettings = useAppSettings();
  const allowed = useMemo(() => {
    const extensions = appSettings?.upload?.allowed_extensions || ['jpg', 'jpeg', 'png'];
    // Add dot prefix for each extension
    return extensions.map(ext => `.${ext}`);
  }, [appSettings]);

  // Reset all local states (called on success and on close)
  const resetForm = () => {
    setFile(null);
    setName('');
    setDescription('');
    setVisibility('private');
    setTags([]);
    // Important: on close, we don't reset to initialLinks to avoid loops;
    // the next open will sync if needed.
    setLinks([]);
    setSubmitting(false);
    setError(null);
  };

  // Sync links from initialLinks only:
  // - when modal opens (isOpen becomes true)
  // - AND if content signature has changed vs previous time
  useEffect(() => {
    const justOpened = !prevIsOpenRef.current && isOpen;
    const contentChanged = prevInitialLinksSigRef.current !== initialLinksSig;

    if (justOpened) {
      // On open, if content different from current state, sync
      if (contentChanged) {
        setLinks(initialLinks);
        prevInitialLinksSigRef.current = initialLinksSig;
      } else {
        // If content identical, don't touch existing links (leave empty by default)
        // setLinks(links); // no-op
      }
    } else if (isOpen && contentChanged) {
      // Modal already open and content actually changed (rare): sync
      setLinks(initialLinks);
      prevInitialLinksSigRef.current = initialLinksSig;
    }

    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialLinksSig, initialLinks]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const submit = async () => {
    if (!file || submitting) return;
    setSubmitting(true);
    setError(null);
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

      const created = await upload(form);
      onUploaded(created);

      resetForm();
      onClose();
    } catch (err: any) {
      // Handle validation errors
      if (err?.data?.errors) {
        // Get the first error message
        const firstError = Object.values(err.data.errors)[0];
        if (Array.isArray(firstError)) {
          setError(firstError[0]);
        } else {
          setError(firstError as string);
        }
      } else if (err?.data?.message) {
        setError(err.data.message);
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue lors du téléversement.');
      }
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
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <FileDropzone
            onFileSelected={(f) => { setFile(f); setName(f.name.replace(/\.[^/.]+$/, '')); setError(null); }}
            accept={allowed.join(',')}
            maxSizeBytes={(appSettings?.upload?.max_file_size || 10) * 1024 * 1024}
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
            <Button disabled={!file || submitting} onClick={submit} className="bg-primary-600 hover:bg-primary-700 text-white">
              {submitting ? 'Téléversement…' : 'Téléverser'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
