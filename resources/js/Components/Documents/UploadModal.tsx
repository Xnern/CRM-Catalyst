import React, { useMemo, useState } from 'react';
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
  onUploaded: () => void;
  searchCompanies: (q: string) => Promise<{ id: number; name: string }[]>;
  searchContacts: (q: string) => Promise<{ id: number; name: string }[]>;
  upload: (form: FormData) => Promise<any>;
};

export const UploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onUploaded,
  searchCompanies,
  searchContacts,
  upload
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private'|'team'|'company'>('private');
  const [tags, setTags] = useState<string[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const allowed = useMemo(() => ['.pdf','.doc','.docx','.xls','.xlsx','.png','.jpg','.jpeg'], []);

  // Reset all local states (called on success and on close)
  const resetForm = () => {
    setFile(null);
    setName('');
    setDescription('');
    setVisibility('private');
    setTags([]);
    setLinks([]);
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
      tags.forEach((t, i) => form.append(`tags[${i}]`, t));
      links.forEach((l, i) => {
        form.append(`links[${i}][type]`, l.type);
        form.append(`links[${i}][id]`, String(l.id));
        if (l.role) form.append(`links[${i}][role]`, l.role);
      });

      await upload(form);
      onUploaded();
      // Important: reset before closing so the next open starts clean
      resetForm();
      onClose();
    } catch {
      // keep the modal open to let the user retry; do not reset file/name
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : null)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>Drop a file, add metadata, links and submit.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FileDropzone
            onFileSelected={(f) => { setFile(f); setName(f.name.replace(/\.[^/.]+$/, '')); }}
            accept={allowed.join(',')}
            maxSizeBytes={25 * 1024 * 1024}
            className="bg-white"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Visibility</label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                <SelectTrigger><SelectValue placeholder="Visibility" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              className="w-full border rounded-md p-2 text-sm bg-white"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Tags</label>
            <TagInput value={tags} onChange={setTags} />
          </div>

          <div>
            <label className="block text-sm mb-1">Links</label>
            <LinkPicker
              value={links}
              onChange={setLinks}
              searchCompanies={searchCompanies}
              searchContacts={searchContacts}
              minChars={2}
              debounceMs={300}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button disabled={!file || submitting} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white">
              {submitting ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
