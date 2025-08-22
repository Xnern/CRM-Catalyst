import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import { X, Save, UploadCloud, FileText, Download, Eye, Building2, User, FilePlus } from 'lucide-react';
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

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/Components/ui/alert-dialog';

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
  owner?: { id: number; name: string; email?: string } | null;
  companies?: { id: number; name: string }[];
  contacts?: { id: number; name: string }[];
  updated_at?: string;
  created_at?: string;
}

type LinkTarget = { type: 'company' | 'contact'; id: number };

type SearchFn = (q: string) => Promise<Array<{ id: number; name: string }>>;

interface DocumentDetailsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  document: DocumentModel | null;
  currentCompanyId?: number;
  onAfterChange?: () => Promise<void> | void;
  searchCompanies?: SearchFn;
  searchContacts?: SearchFn;
}

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
  // Local working document state
  const [localDoc, setLocalDoc] = useState<DocumentModel | null>(null);
  const docId = document?.id ?? null;

  // Editable metadata
  const [editName, setEditName] = useState('');
  const [editVisibility, setEditVisibility] = useState<Visibility>('private');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  // Document versions
  const { data: versions } = useListDocumentVersionsQuery(docId as number, { skip: !docId });
  const versionsList = useMemo(() => {
    if (!versions) return [];
    const arr = Array.isArray(versions)
      ? versions
      : (Array.isArray((versions as any).data) ? (versions as any).data : []);
    return arr as any[];
  }, [versions]);

  const [uploadVersion, { isLoading: uploadingVersion }] = useUploadDocumentVersionMutation();

  // API mutations
  const [updateDocMeta, { isLoading: savingMeta }] = useUpdateDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();
  const [linkDocument] = useLinkDocumentMutation();
  const [unlinkDocument] = useUnlinkDocumentMutation();

  // File input reference
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Prevent flash: hydrate only when id changes, merge otherwise
  const prevIdRef = useRef<number | null>(null);

  useEffect(() => {
    const newId = document?.id ?? null;

    if (!newId && !open) {
      setLocalDoc(null);
      prevIdRef.current = null;
      return;
    }

    if (newId) {
      if (prevIdRef.current !== newId) {
        setLocalDoc(document as DocumentModel);
        setEditName(document?.name ?? '');
        setEditVisibility((document?.visibility as Visibility) ?? 'private');
        setEditDescription(document?.description ?? '');
        setEditTags(document?.tags ?? []);
        prevIdRef.current = newId;
        return;
      }
      setLocalDoc((prev) => (prev ? { ...prev, ...document } : (document as DocumentModel)));
    }
  }, [document?.id, open, document?.name, document?.description, document?.visibility, document?.tags]);

  // Save document metadata
  const handleSaveMeta = useCallback(async () => {
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
      setLocalDoc((s) =>
        s ? ({ ...s, name: editName, description: editDescription, visibility: editVisibility, tags: editTags }) : s
      );
      await onAfterChange?.();
    } catch {
      toast.error('Échec de la sauvegarde.');
    }
  }, [localDoc?.id, editName, editDescription, editVisibility, editTags, onAfterChange, updateDocMeta]);

  // Upload new document version
  const handleUploadVersion = useCallback(async (file: File) => {
    if (!localDoc?.id) return;
    try {
      await uploadVersion({ id: localDoc.id, file }).unwrap();
      toast.success('Nouvelle version uploadée.');
      setLocalDoc((s) => s ? ({ ...s, updated_at: `${Date.now()}` }) : s);
      await onAfterChange?.();
    } catch {
      toast.error("Échec de l'upload de la nouvelle version.");
    }
  }, [localDoc?.id, uploadVersion, onAfterChange]);

  // Attach link to document
  const attach = useCallback(async (val: LinkTarget) => {
    if (!localDoc?.id) return;
    try {
      await linkDocument({ id: localDoc.id, payload: val }).unwrap();
      setLocalDoc((prev) => {
        if (!prev) return prev;
        if (val.type === 'company') {
          const exists = prev.companies?.some((c) => c.id === val.id);
          const companies = exists ? prev.companies! : [...(prev.companies ?? []), { id: val.id, name: (val as any).name ?? `Entreprise #${val.id}` }];
          return { ...prev, companies };
        } else {
          const exists = prev.contacts?.some((c) => c.id === val.id);
          const contacts = exists ? prev.contacts! : [...(prev.contacts ?? []), { id: val.id, name: (val as any).name ?? `Contact #${val.id}` }];
          return { ...prev, contacts };
        }
      });
      toast.success('Lien ajouté.');
      await onAfterChange?.();
    } catch {
      toast.error("Échec de l'association.");
    }
  }, [localDoc?.id, linkDocument, onAfterChange]);

  // Detach link from document
  const detach = useCallback(async (val: LinkTarget) => {
    if (!localDoc?.id) return;
    try {
      await unlinkDocument({ id: localDoc.id, payload: val }).unwrap();
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
      await onAfterChange?.();
    } catch {
      toast.error('Échec du retrait du lien.');
    }
  }, [localDoc?.id, unlinkDocument, onAfterChange]);

  // Delete/detach confirmation dialog
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'detach' | 'delete'>('detach');

  const confirmDelete = useCallback(async () => {
    if (!localDoc?.id || deleteBusy) return;
    setDeleteBusy(true);
    try {
      if (deleteMode === 'detach' && currentCompanyId) {
        await unlinkDocument({ id: localDoc.id, payload: { type: 'company', id: currentCompanyId } }).unwrap();
        toast.success('Document détaché de l\'entreprise.');
        onOpenChange(false);
      } else if (deleteMode === 'delete') {
        await deleteDocument({ id: localDoc.id, hard: true } as any).unwrap();
        toast.success('Document supprimé définitivement.');
        onOpenChange(false);
      }
      setDeleteOpen(false);
      await onAfterChange?.();
    } catch {
      toast.error('Action impossible.');
    } finally {
      setDeleteBusy(false);
    }
  }, [localDoc?.id, deleteMode, currentCompanyId, unlinkDocument, deleteDocument, onOpenChange, onAfterChange, deleteBusy]);

  // Computed information
  const infoType = localDoc?.extension?.toUpperCase() || localDoc?.mime_type || '-';
  const infoSize = formatBytes(localDoc?.size_bytes);
  const infoOwner = localDoc?.owner?.name || '-';
  const infoCreated = localDoc?.created_at ? new Date(localDoc.created_at).toLocaleString() : '-';
  const infoUpdated = localDoc?.updated_at ? new Date(localDoc.updated_at).toLocaleString() : '-';

  const hasDoc = !!localDoc?.id;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
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
              {!hasDoc ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" />
                  Chargement des détails...
                </div>
              ) : (
                <>
                  <div className="rounded-md border p-4 bg-white space-y-4">
                    {/* Header actions and main info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {iconForExtension(localDoc?.extension)}
                        <div className="text-sm text-gray-700">
                          <div className="font-medium text-gray-900">{localDoc?.name}</div>
                          <div className="text-xs text-gray-500">{localDoc?.original_filename}</div>
                          <div className="mt-1 text-xs text-gray-600">
                            <span className="mr-2">{infoType}</span>
                            <span className="text-gray-400">•</span>
                            <span className="mx-2">{infoSize}</span>
                            <span className="text-gray-400">•</span>
                            <span className="mx-2">Créateur: {infoOwner}</span>
                            <span className="text-gray-400">•</span>
                            <span className="mx-2">Créé: {infoCreated}</span>
                            <span className="text-gray-400">•</span>
                            <span className="mx-2">MAJ: {infoUpdated}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => openOrDownload(localDoc!.id)} className="gap-1">
                          <Download className="h-4 w-4" /> Télécharger
                        </Button>
                        <Button variant="outline" onClick={() => openOrDownload(localDoc!.id)} className="gap-1">
                          <Eye className="h-4 w-4" /> Ouvrir
                        </Button>
                      </div>
                    </div>

                    {/* Grid layout: left metadata / right preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left column: metadata, tags, links, versions */}
                      <div className="space-y-4">
                        {/* Editable metadata section */}
                        <div className="rounded-md border p-3 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-gray-500">Nom</div>
                              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Visibilité</div>
                              <select
                                className="border rounded-md px-3 py-2 text-sm w-full"
                                value={editVisibility}
                                onChange={(e) => setEditVisibility(e.target.value as Visibility)}
                              >
                                <option value="private">private</option>
                                <option value="team">team</option>
                                <option value="company">company</option>
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <div className="text-xs text-gray-500">Description</div>
                              <textarea
                                className="w-full border rounded-md p-2 text-sm"
                                rows={3}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Ajouter une description"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Linked entities section */}
                        <div className="rounded-md border p-3 bg-white space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Building2 className="h-4 w-4" />
                            Entreprises liées :
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(localDoc?.companies) && localDoc!.companies.length > 0
                              ? localDoc!.companies.map((c) => {
                                  const id = Number((c as any)?.id);
                                  const name = (c as any)?.name ?? `Entreprise #${id || '-'}`;
                                  if (!id) return null;
                                  return (
                                    <span key={`c-${id}`} className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs inline-flex items-center gap-2">
                                      {String(name)}
                                      <button
                                        type="button"
                                        onClick={() => detach({ type: 'company', id })}
                                        className="inline-flex items-center justify-center rounded hover:bg-red-50"
                                        aria-label="Retirer"
                                      >
                                        <X className="h-3.5 w-3.5 text-red-600 hover:text-red-700" />
                                      </button>
                                    </span>
                                  );
                                })
                              : <span className="text-gray-500 text-sm">—</span>}
                          </div>

                          {/* Linked contacts section */}
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <User className="h-4 w-4" />
                            Contacts liés :
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(localDoc?.contacts) && localDoc!.contacts.length > 0
                              ? localDoc!.contacts.map((c) => {
                                  const id = Number((c as any)?.id);
                                  const name = (c as any)?.name ?? `Contact #${id || '-'}`;
                                  if (!id) return null;
                                  return (
                                    <span key={`p-${id}`} className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs inline-flex items-center gap-2">
                                      {String(name)}
                                      <button
                                        type="button"
                                        onClick={() => detach({ type: 'contact', id })}
                                        className="inline-flex items-center justify-center rounded hover:bg-red-50"
                                        aria-label="Retirer"
                                      >
                                        <X className="h-3.5 w-3.5 text-red-600 hover:text-red-700" />
                                      </button>
                                    </span>
                                  );
                                })
                              : <span className="text-gray-500 text-sm">—</span>}
                          </div>

                          {/* Link picker component */}
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

                        {/* Document versions section */}
                        <div className="rounded-md border p-3 bg-white">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-900">Versions</div>

                            {/* Hidden file input with trigger button */}
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
                                    e.currentTarget.value = ''; // Reset input
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
                            {versionsList.length > 0 ? (
                              versionsList.map((v: any) => {
                                const ver = Number(v?.version) || '?';
                                const mm = (v?.mime_type ?? '').toString();
                                const sz = Number(v?.size_bytes) || 0;
                                const created = v?.created_at ? new Date(v.created_at).toLocaleString() : '';
                                const key = v?.id ?? `${ver}-${created}`;
                                return (
                                  <div key={key} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FilePlus className="h-4 w-4 text-gray-600" />
                                      <span>v{ver}</span>
                                      <span className="text-gray-500">{mm}</span>
                                      <span className="text-gray-500">({formatBytes(sz)})</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {created}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-gray-500 text-sm">Aucune version.</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right column: document preview */}
                      <div className="rounded-md border bg-white p-2 lg:p-3">
                        <DocumentPreview document={localDoc} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal footer actions */}
            <div className="px-6 py-3" style={{ flex: '0 0 auto', background: 'white', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex justify-between gap-2">
                <div className="text-sm text-gray-600">
                  {hasDoc ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="font-medium">{localDoc?.original_filename || localDoc?.name}</span>
                      <span className="text-gray-400">•</span>
                      <span>{localDoc?.extension?.toUpperCase() || localDoc?.mime_type || '-'}</span>
                      <span className="text-gray-400">•</span>
                      <span>{formatBytes(localDoc?.size_bytes)}</span>
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
                  <Button onClick={handleSaveMeta} className="gap-1" disabled={savingMeta || !localDoc?.id}>
                    <Save className="h-4 w-4" /> Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete/detach confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === 'delete'
                ? "Voulez-vous vraiment supprimer définitivement ce document ? Cette action est irréversible."
                : "Voulez-vous détacher ce document de l'entreprise ? Le fichier restera disponible ailleurs."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            {deleteMode === 'detach' && (
              <Button variant="outline" onClick={confirmDelete} disabled={!currentCompanyId || deleteBusy}>
                Détacher de l'entreprise
              </Button>
            )}
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" disabled={deleteBusy}>
              {deleteMode === 'delete' ? 'Supprimer définitivement' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
