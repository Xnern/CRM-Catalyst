import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/Components/ui/alert-dialog';
import { FileText, UploadCloud, FilePlus, User, Download, Eye, Building2, X } from 'lucide-react';
import { toast } from 'sonner';

import { TagInput } from '@/Components/Documents/TagInput';
import { LinkPicker } from '@/Components/Documents/LinkPicker';
import { DocumentPreview } from '@/Components/Documents/DocumentPreview';

import {
  useListDocumentVersionsQuery,
  useUploadDocumentVersionMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useLinkDocumentMutation,
  useUnlinkDocumentMutation,
} from '@/services/api';

type Visibility = 'private' | 'team' | 'company';

export interface DocumentModel {
  id: number;
  name: string;
  original_filename?: string;
  mime_type?: string;
  extension?: string | null;
  size_bytes?: number;
  visibility?: Visibility;
  description?: string | null;
  tags?: string[];
  owner?: { id: number; name: string } | null;
  companies?: { id: number; name: string; role?: string | null }[];
  contacts?: { id: number; name: string; role?: string | null }[];
  updated_at?: string;
  created_at?: string;
}

type LinkTarget = { type: 'company' | 'contact'; id: number; role?: string };

interface DocumentDetailsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  document: DocumentModel | null;
  currentCompanyId?: number;
  onAfterChange?: () => void;
  searchCompanies?: (q: string) => Promise<Array<{ id: number; name: string }>>;
  searchContacts?: (q: string) => Promise<Array<{ id: number; name: string }>>;
}

// Utils
const formatBytes = (n?: number) => {
  const b = n ?? 0;
  if (!b) return '0B';
  const u = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)}${u[i]}`;
};

const iconForExtension = (_ext?: string | null) => {
  return <FileText className="h-5 w-5 text-gray-700" />;
};

const openOrDownload = async (docId: number) => {
  try {
    const resp = await fetch(`/api/documents/${docId}/download`, { credentials: 'include' });
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const json = await resp.json();
      if (json?.url) {
        window.open(json.url, '_blank');
        return;
      }
    }
    window.open(`/api/documents/${docId}/download`, '_blank');
  } catch {
    window.open(`/api/documents/${docId}/download`, '_blank');
  }
};

export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  open,
  onOpenChange,
  document,
  currentCompanyId,
  onAfterChange,
  searchCompanies = async () => [],
  searchContacts = async () => [],
}) => {
  // Local working doc
  const [localDoc, setLocalDoc] = useState<DocumentModel | null>(null);

  // Editable meta
  const [editName, setEditName] = useState('');
  const [editVisibility, setEditVisibility] = useState<Visibility>('private');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  // Versions
  const { data: versions } = useListDocumentVersionsQuery(document?.id!, { skip: !document?.id });
  const [uploadVersion, { isLoading: uploadingVersion }] = useUploadDocumentVersionMutation();

  // Mutations
  const [updateDocMeta, { isLoading: savingMeta }] = useUpdateDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();
  const [linkDocument] = useLinkDocumentMutation();
  const [unlinkDocument] = useUnlinkDocumentMutation();

  // Delete confirm dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'detach' | 'delete'>('detach');

  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hydrate when external document changes
  useEffect(() => {
    if (!document) return;
    setLocalDoc(document);
    setEditName(document.name ?? '');
    setEditVisibility((document.visibility as Visibility) ?? 'private');
    setEditDescription(document.description ?? '');
    setEditTags(document.tags ?? []);
  }, [document]);

  // Save metadata and notify parent
  const handleSaveMeta = async () => {
    if (!localDoc?.id) return;
    try {
      await updateDocMeta({
        id: localDoc.id,
        data: {
          name: editName,
          description: editDescription,
          visibility: editVisibility,
          tags: editTags,
        },
      }).unwrap();
      toast.success('Détails sauvegardés.');
      setLocalDoc((s) => s ? ({ ...s, name: editName, description: editDescription, visibility: editVisibility, tags: editTags }) : s);
      onAfterChange?.();
    } catch {
      toast.error('Échec de la sauvegarde.');
    }
  };

  // Upload new version
  const handleUploadVersion = async (file: File) => {
    if (!localDoc?.id) return;
    try {
      await uploadVersion({ id: localDoc.id, file }).unwrap();
      toast.success('Nouvelle version uploadée.');
      setLocalDoc((s) => s ? ({ ...s, updated_at: `${Date.now()}` }) : s);
      onAfterChange?.();
    } catch {
      toast.error("Échec de l'upload de la nouvelle version.");
    }
  };

  // Attach target with instant local update
  const attach = async (val: LinkTarget) => {
    if (!localDoc?.id) return;
    try {
      await linkDocument({ id: localDoc.id, payload: val }).unwrap();
      // Instant local optimistic update
      setLocalDoc((prev) => {
        if (!prev) return prev;
        if (val.type === 'company') {
          const exists = prev.companies?.some((c) => c.id === val.id);
          const companies = exists ? prev.companies! : [...(prev.companies ?? []), { id: val.id, name: (val as any).name ?? '', role: val.role ?? null }];
          return { ...prev, companies };
        } else {
          const exists = prev.contacts?.some((c) => c.id === val.id);
          const contacts = exists ? prev.contacts! : [...(prev.contacts ?? []), { id: val.id, name: (val as any).name ?? '', role: val.role ?? null }];
          return { ...prev, contacts };
        }
      });
      toast.success('Lien ajouté.');
      onAfterChange?.();
    } catch {
      toast.error("Échec de l'association.");
    }
  };

  // Detach target with instant local update
  const detach = async (val: LinkTarget) => {
    if (!localDoc?.id) return;
    try {
      await unlinkDocument({ id: localDoc.id, payload: val }).unwrap();
      // Instant local optimistic update
      setLocalDoc((prev) => {
        if (!prev) return prev;
        if (val.type === 'company') {
          const companies = (prev.companies ?? []).filter((c) => c.id !== val.id);
          return { ...prev, companies };
        } else {
          const contacts = (prev.contacts ?? []).filter((c) => c.id !== val.id);
          return { ...prev, contacts };
        }
      });
      toast.success('Lien retiré.');
      onAfterChange?.();
    } catch {
      toast.error('Échec du retrait du lien.');
    }
  };

  // Confirm delete/detach
  const confirmDelete = async () => {
    if (!localDoc?.id) return;
    try {
      if (deleteMode === 'detach' && currentCompanyId) {
        await unlinkDocument({ id: localDoc.id, payload: { type: 'company', id: currentCompanyId } }).unwrap();
        toast.success('Document détaché de l’entreprise.');
        onOpenChange(false);
      } else if (deleteMode === 'delete') {
        await deleteDocument({ id: localDoc.id, hard: true } as any).unwrap();
        toast.success('Document supprimé définitivement.');
        onOpenChange(false);
      }
      setDeleteOpen(false);
      onAfterChange?.();
    } catch {
      toast.error('Action impossible.');
    }
  };

  return (
    <>
      <Dialog open={open && !!localDoc} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[980px] p-0 [&>button[type='button']]:z-30" style={{ overflow: 'hidden' }}>
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
            <div className="px-6 py-4">
              <DialogHeader className="p-0">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-700" />
                  Détails du document
                </DialogTitle>
                <DialogDescription>Informations, liens, tags, versions et aperçu</DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {!localDoc ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" />
                  Chargement des détails...
                </div>
              ) : (
                <>
                  <div className="rounded-md border p-4 bg-white space-y-4">
                    {/* Top actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {iconForExtension(localDoc.extension)}
                        <div className="text-sm text-gray-700">
                          <div className="font-medium text-gray-900">{localDoc.name}</div>
                          <div className="text-xs text-gray-500">{localDoc.original_filename}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => openOrDownload(localDoc.id)} className="gap-1">
                          <Download className="h-4 w-4" /> Télécharger
                        </Button>
                        <Button variant="outline" onClick={() => openOrDownload(localDoc.id)} className="gap-1">
                          <Eye className="h-4 w-4" /> Ouvrir
                        </Button>
                        {!!currentCompanyId && (
                          <Button variant="outline" className="text-red-600" onClick={() => { setDeleteMode('detach'); setDeleteOpen(true); }}>
                            Détacher
                          </Button>
                        )}
                        <Button variant="outline" className="text-red-600" onClick={() => { setDeleteMode('delete'); setDeleteOpen(true); }}>
                          Supprimer
                        </Button>
                      </div>
                    </div>

                    {/* Grid: left meta / right preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left: meta, tags, links, versions */}
                      <div className="space-y-4">
                        {/* Editable meta */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-500">Nom</div>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Visibilité</div>
                            <Select value={editVisibility} onValueChange={(v) => setEditVisibility(v as Visibility)}>
                              <SelectTrigger><SelectValue placeholder="Visibilité" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="private">Privé</SelectItem>
                                <SelectItem value="team">Équipe</SelectItem>
                                <SelectItem value="company">Entreprise</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2">
                            <div className="text-xs text-gray-500">Description</div>
                            <textarea
                              className="w-full border rounded-md p-2 text-sm"
                              rows={3}
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Tags */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Tags</div>
                          <TagInput value={editTags} onChange={setEditTags} />
                        </div>

                        {/* Links */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Building2 className="h-4 w-4" />
                            Entreprises liées :
                            <div className="flex flex-wrap gap-2">
                              {localDoc.companies?.length
                                ? localDoc.companies.map((c) => (
                                    <span key={`c-${c.id}`} className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs inline-flex items-center gap-2">
                                      {c.name}{c.role ? <span className="text-gray-500">({c.role})</span> : null}
                                      <button
                                        type="button"
                                        onClick={() => detach({ type: 'company', id: c.id })}
                                        className="inline-flex items-center justify-center rounded hover:bg-red-50"
                                        aria-label="Retirer"
                                      >
                                        <X className="h-3.5 w-3.5 text-red-600 hover:text-red-700" />
                                      </button>
                                    </span>
                                  ))
                                : <span className="text-gray-500">—</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <User className="h-4 w-4" />
                            Contacts liés :
                            <div className="flex flex-wrap gap-2">
                              {localDoc.contacts?.length
                                ? localDoc.contacts.map((c) => (
                                    <span key={`p-${c.id}`} className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs inline-flex items-center gap-2">
                                      {c.name}{c.role ? <span className="text-gray-500">({c.role})</span> : null}
                                      <button
                                        type="button"
                                        onClick={() => detach({ type: 'contact', id: c.id })}
                                        className="inline-flex items-center justify-center rounded hover:bg-red-50"
                                        aria-label="Retirer"
                                      >
                                        <X className="h-3.5 w-3.5 text-red-600 hover:text-red-700" />
                                      </button>
                                    </span>
                                  ))
                                : <span className="text-gray-500">—</span>}
                            </div>
                          </div>

                          {/* LinkPicker: allow searching both companies and contacts */}
                          <div className="mt-1">
                            <LinkPicker
                              value={[]}
                              onChange={async (vals) => {
                                for (const val of vals) {
                                  await attach(val as LinkTarget);
                                }
                              }}
                              searchCompanies={searchCompanies}
                              searchContacts={searchContacts}
                              minChars={2}
                              debounceMs={300}
                            />
                          </div>
                        </div>

                        {/* Versions */}
                        <div className="rounded-md border p-3 bg-white">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-900">Versions</div>

                            {/* Hidden file input + trigger button */}
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              onChange={async (e) => {
                                const f = e.currentTarget.files?.[0];
                                if (f && localDoc?.id) {
                                  try {
                                    await handleUploadVersion(f);
                                  } finally {
                                    e.currentTarget.value = '';
                                  }
                                } else {
                                  e.currentTarget.value = '';
                                }
                              }}
                            />

                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => fileInputRef.current?.click()}
                              type="button"
                              disabled={uploadingVersion || !localDoc?.id}
                              title={!localDoc?.id ? 'Aucun document sélectionné' : undefined}
                            >
                              <UploadCloud className="h-4 w-4" />
                              {uploadingVersion ? 'Envoi...' : 'Nouvelle version'}
                            </Button>
                          </div>
                          <div className="mt-2 text-sm text-gray-700 space-y-1 max-h-48 overflow-auto pr-4">
                            {Array.isArray(versions) && versions.length > 0 ? (
                              versions.map((v: any) => (
                                <div key={v.id} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FilePlus className="h-4 w-4 text-gray-600" />
                                    <span>v{v.version}</span>
                                    <span className="text-gray-500">{v.mime_type}</span>
                                    <span className="text-gray-500">({formatBytes(v.size_bytes)})</span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {v.created_at ? new Date(v.created_at).toLocaleString() : ''}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-500 text-sm">Aucune version.</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: preview */}
                      <div className="rounded-md border bg-white p-2 lg:p-3">
                        {localDoc && (
                          <DocumentPreview key={`${localDoc.id}-${localDoc.updated_at}`} document={localDoc} />
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-3" style={{ flex: '0 0 auto', background: 'white', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex justify-between gap-2">
                <div className="text-sm text-gray-600">
                  {localDoc ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="font-medium">{localDoc.original_filename}</span>
                      <span className="text-gray-400">•</span>
                      <span>{localDoc.extension?.toUpperCase() || localDoc.mime_type}</span>
                      <span className="text-gray-400">•</span>
                      <span>{formatBytes(localDoc.size_bytes)}</span>
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
                  <Button onClick={handleSaveMeta} className="gap-1" disabled={savingMeta}>
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete/Detach confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l’action</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === 'delete'
                ? "Voulez-vous vraiment supprimer définitivement ce document ? Cette action est irréversible."
                : "Voulez-vous détacher ce document de l’entreprise ? Le fichier restera disponible ailleurs."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            {deleteMode === 'detach' && (
              <Button variant="outline" onClick={confirmDelete} disabled={!currentCompanyId}>
                Détacher de l’entreprise
              </Button>
            )}
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {deleteMode === 'delete' ? 'Supprimer définitivement' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
