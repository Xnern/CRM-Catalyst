import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useLinkDocumentMutation,
  useUnlinkDocumentMutation,
  useLazySearchCompaniesQuery,
  useLazySearchContactsQuery,
} from '@/services/api';

import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/Components/ui/select';
import { Card, CardContent } from '@/Components/ui/card';
import { UploadModal } from '@/Components/Documents/UploadModal';
import { DocumentDetailsModal } from '@/Components/Documents/DocumentDetailsModal';
import { Document } from '@/types/Document';

import {
  FileText, Search, Plus, Trash2, Eye, Loader2, Download, MoreVertical,
  Tag as TagIcon,
} from 'lucide-react';

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator
} from '@/Components/ui/dropdown-menu';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/Components/ui/alert-dialog';

import { toast } from 'sonner';

// Types
type Props = { auth: any };

// Format bytes to human readable (e.g. "1.2MB")
const formatBytes = (n: number) => {
  if (!n) return '0B';
  const u = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(1)}${u[i]}`;
};

// Badge for visibility
const badgeForVisibility = (v: Document['visibility']) => {
  switch (v) {
    case 'private':
      return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300';
    case 'team':
      return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200';
    case 'company':
      return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200';
    default:
      return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300';
  }
};

const iconForExtension = (ext?: string | null) => {
  const e = (ext || '').toLowerCase();
  if (e === 'pdf') return <FileText className="h-4 w-4 text-red-600" />;
  if (['doc', 'docx'].includes(e)) return <FileText className="h-4 w-4 text-blue-600" />;
  if (['xls', 'xlsx', 'csv'].includes(e)) return <FileText className="h-4 w-4 text-green-600" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e)) return <FileText className="h-4 w-4 text-purple-600" />;
  return <FileText className="h-4 w-4 text-gray-600" />;
};

export default function DocumentsIndex({ auth }: Props) {
  // Ensure CSRF cookie for Sanctum
  useEffect(() => {
    fetch('/sanctum/csrf-cookie', { credentials: 'include' }).catch(() => {});
  }, []);

  // Filters and state
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [recherche, setRecherche] = useState('');
  const [type, setType] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [sort, setSort] = useState('-created_at');

  const [openUpload, setOpenUpload] = useState(false);

  // Details modal via reusable component
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsDoc, setDetailsDoc] = useState<Document | null>(null);

  // Delete confirm modal state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  // Query params
  const queryParams = useMemo(() => ({
    page, per_page: perPage,
    search: recherche || undefined,
    type: type || undefined,
    tag: tag || undefined,
    sort,
  }), [page, perPage, recherche, type, tag, sort]);

  // Data queries
  const { data: list, isLoading, isFetching, refetch } = useGetDocumentsQuery(queryParams);
  const items: Document[] = (list as any)?.data ?? [];
  const currentPage = (list as any)?.meta?.current_page ?? page;
  const total = (list as any)?.meta?.total ?? items.length;
  const lastPage = (list as any)?.meta?.last_page ?? 1;
  const estEnChargement = isLoading || isFetching;

  // Mutations
  const [uploadDocument] = useUploadDocumentMutation();
  const [updateDocument] = useUpdateDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();
  const [linkDocument] = useLinkDocumentMutation();
  const [unlinkDocument] = useUnlinkDocumentMutation();

  // Lazy search hooks (RTK), to pass into modal and upload dialog
  const [triggerCompanies] = useLazySearchCompaniesQuery();
  const [triggerContacts] = useLazySearchContactsQuery();

  const searchCompanies = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) return [];
    try {
      const res: any = await triggerCompanies(q).unwrap();
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }, [triggerCompanies]);

  const searchContacts = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) return [];
    try {
      const res: any = await triggerContacts(q).unwrap();
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }, [triggerContacts]);

  // Refresh a specific document (used after attach/detach or meta save)
  const refreshOne = async (id: number) => {
    try {
      const resp = await fetch(`/api/documents/${id}`, { credentials: 'include' });
      if (resp.ok) {
        const full = await resp.json();
        setDetailsDoc(full as Document);
      }
    } catch {}
  };

  // Upload controls
  const ouvrirUpload = () => setOpenUpload(true);
  const fermerUpload = () => setOpenUpload(false);
  const onUploaded = () => { toast.success('Document importé.'); refetch(); };

  // Open details modal (load full resource, then open)
  const ouvrirDetails = async (d: Document) => {
    try {
      const resp = await fetch(`/api/documents/${d.id}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (resp.ok) {
        const full = await resp.json();
        setDetailsDoc(full as Document);
      } else {
        setDetailsDoc(d);
      }
    } catch {
      setDetailsDoc(d);
    }
    setDetailsOpen(true);
  };

  // Download/preview handler
  const download = async (d: Document) => {
    try {
      const resp = await fetch(`/api/documents/${d.id}/download`, { credentials: 'include' });
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await resp.json();
        if (json?.url) {
          window.open(json.url, '_blank');
          return;
        }
      }
      window.open(`/api/documents/${d.id}/download`, '_blank');
    } catch {
      toast.error('Téléchargement impossible.');
    }
  };

  // Open delete confirmation
  const demanderSuppression = (doc: Document) => {
    setDeleteTarget(doc);
    setIsDeleteDialogOpen(true);
  };

  // Confirm deletion
  const confirmerSuppression = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument({ id: deleteTarget.id }).unwrap();
      toast.success('Document supprimé.');
      if (detailsDoc?.id === deleteTarget.id) { setDetailsOpen(false); setDetailsDoc(null); }
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error('Échec de la suppression.');
    }
  };

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Documents</h2>}>
      <Head title="Documents" />
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <div className="text-lg font-semibold">Gestion des documents</div>
                </div>
                <Button onClick={ouvrirUpload} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" />
                  Nouveau document
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {/* Search */}
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
                  <Input
                    className="pl-8 w-[260px] sm:w-[300px]"
                    placeholder="Rechercher (nom, fichier, description)"
                    value={recherche}
                    onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
                  />
                </div>
                {/* Type */}
                <Select value={type || 'tous'} onValueChange={(v) => { setType(v === 'tous' ? '' : v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous types</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="image">image/</SelectItem>
                  </SelectContent>
                </Select>
                {/* Tag */}
                <div className="relative">
                  <TagIcon className="h-4 w-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
                  <Input
                    className="pl-8 w-[160px]"
                    placeholder="Tag"
                    value={tag}
                    onChange={(e) => { setTag(e.target.value); setPage(1); }}
                  />
                </div>
                {/* Sort */}
                <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tri" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created_at">Plus récents</SelectItem>
                    <SelectItem value="created_at">Plus anciens</SelectItem>
                    <SelectItem value="name">Nom A→Z</SelectItem>
                    <SelectItem value="-name">Nom Z→A</SelectItem>
                    <SelectItem value="-size_bytes">Plus lourds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="px-4 py-2">Nom</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Taille</th>
                    <th className="px-4 py-2">Visibilité</th>
                    <th className="px-4 py-2">Auteur</th>
                    <th className="px-4 py-2">Créé le</th>
                    <th className="px-4 py-2 w-[160px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {estEnChargement && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement...
                        </div>
                      </td>
                    </tr>
                  )}
                  {!estEnChargement && items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                        Aucun document. Importez-en un nouveau.
                      </td>
                    </tr>
                  )}
                  {items.map((d: Document) => (
                    <tr
                      key={d.id}
                      className="border-t hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => ouvrirDetails(d)}
                      title="Cliquer pour voir les détails"
                    >
                      <td className="px-4 py-2 font-medium text-gray-900 flex items-center gap-2">
                        {iconForExtension(d.extension)}
                        <span>{d.name}</span>
                        <span className="text-xs text-gray-500">({d.original_filename})</span>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{d.extension?.toUpperCase() || d.mime_type}</td>
                      <td className="px-4 py-2 text-gray-700">{formatBytes(d.size_bytes)}</td>
                      <td className="px-4 py-2">
                        <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', badgeForVisibility(d.visibility)].join(' ')}>
                          {d.visibility}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{d.owner?.name ?? '-'}</td>
                      <td className="px-4 py-2 text-gray-700">{d.created_at ? new Date(d.created_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <Button
                            title="Télécharger"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity"
                            onClick={() => download(d)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            title="Détails"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity"
                            onClick={() => ouvrirDetails(d)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button title="Plus d'actions" variant="ghost" size="icon" className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => download(d)} className="gap-2">
                                <Download className="h-4 w-4" /> Télécharger
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => ouvrirDetails(d)} className="gap-2">
                                <Eye className="h-4 w-4" /> Détails
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => demanderSuppression(d)}
                                className="text-red-600 gap-2"
                              >
                                <Trash2 className="h-4 w-4" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-gray-600">Résultats : {total}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || estEnChargement}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <div className="px-2 py-1 text-sm">Page {currentPage} / {lastPage}</div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= lastPage || estEnChargement}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Dialog */}
        <UploadModal
          isOpen={openUpload}
          onClose={fermerUpload}
          onUploaded={onUploaded}
          searchCompanies={searchCompanies}
          searchContacts={searchContacts}
          upload={async (form) => {
            await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
            return await uploadDocument(form).unwrap();
          }}
        />

        {/* Details Dialog via reusable component */}
        <DocumentDetailsModal
          open={detailsOpen && !!detailsDoc}
          onOpenChange={(o) => setDetailsOpen(o)}
          document={detailsDoc}
          onAfterChange={() => {
            if (detailsDoc?.id) refreshOne(detailsDoc.id);
            refetch();
          }}
          searchCompanies={searchCompanies}
          searchContacts={searchContacts}
        />

        {/* Delete confirmation dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le document ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera définitivement “{deleteTarget?.name}”. Elle est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmerSuppression} className="bg-red-600 hover:bg-red-700">
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthenticatedLayout>
  );
}
