import React, { useMemo, useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
  useGetCompanyQuery,
  useDeleteCompanyMutation,
  useUpdateCompanyMutation,
  // Contacts list/CRUD - Using optimized generic hooks
  useGetCompanyContactsQuery,
  useAddContactMutation, // Instead of useCreateCompanyContactMutation
  useUpdateContactMutation, // Instead of useUpdateCompanyContactMutation
  useDeleteContactMutation, // Instead of useDeleteCompanyContactMutation
  // Unassigned list + attach existing
  useGetUnassignedContactsQuery,
  useAttachCompanyContactMutation,
  useDetachCompanyContactMutation,
  // Meta
  useGetCompanyStatusOptionsQuery,
  // Documents
  useLazyGetCompanyDocumentsQuery,
  useUnlinkDocumentMutation,
  useUploadDocumentMutation,
} from '@/services/api';

import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/Components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator
} from '@/Components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Building2, ArrowLeft, MoreVertical, Pencil, Trash2,
  Plus, Loader2, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';

import CompanyAddressMapSplit, { SplitAddress } from '@/Components/Companies/CompanyAddressMapSplit';
import ContactForm from '@/Components/ContactForm';
import { Company } from '@/types/Company';
import { Document } from '@/types/Document';
import { DocumentDetailsModal } from '@/Components/Documents/DocumentDetailsModal';
import { UploadModal } from '@/Components/Documents/UploadModal';

type Props = { auth: any; id: number };
type ApiErrors = Record<string, string[] | string> | undefined;

// Badge styling
const companyBadgeClasses = (status?: string) => {
  switch (status) {
    case 'Client':
      return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200';
    case 'Prospect':
      return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200';
    case 'Inactif':
    default:
      return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300';
  }
};

export default function CompanyShow({ auth, id }: Props) {
  // Company detail: API returns { data: Company }
  const { data: companyApi, isLoading, refetch: refetchCompany } = useGetCompanyQuery(id);
  const company: Company | null = (companyApi as any)?.data ?? null;

  const [deleteCompany] = useDeleteCompanyMutation();
  const [updateCompany] = useUpdateCompanyMutation();

  // Global modals
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Edit form state
  const [form, setForm] = useState<Partial<Company> & SplitAddress>({
    name: '',
    domain: '',
    industry: '',
    size: '',
    status: 'Prospect',
    address: '',
    city: '',
    zipcode: '',
    country: '',
    notes: '',
    latitude: null,
    longitude: null
  });
  const [companyErrors, setCompanyErrors] = useState<ApiErrors>(undefined);

  // Status options
  const { data: companyStatusesRes } = useGetCompanyStatusOptionsQuery();
  const companyStatusOptions = useMemo(
    () =>
      (companyStatusesRes?.data && Array.isArray(companyStatusesRes.data) && companyStatusesRes.data.length > 0)
        ? companyStatusesRes.data
        : [
            { value: 'Prospect', label: 'Prospect' },
            { value: 'Client', label: 'Client' },
            { value: 'Inactif', label: 'Inactif' },
          ],
    [companyStatusesRes?.data]
  );


  // Hydrate form when company changes
  useEffect(() => {
    if (company) {
      setForm({
        id: company.id,
        name: company.name,
        domain: company.domain ?? '',
        industry: company.industry ?? '',
        size: company.size ?? '',
        status: company.status,
        address: company.address ?? '',
        city: company.city ?? '',
        zipcode: company.zipcode ?? '',
        country: company.country ?? '',
        notes: company.notes ?? '',
        latitude: (company as any).latitude ?? null,
        longitude: (company as any).longitude ?? null
      });
      setCompanyErrors(undefined);
    }
  }, [company]);

  // Delete company
  const demanderSuppression = () => setIsDeleteDialogOpen(true);
  const confirmerSuppression = async () => {
    try {
      await deleteCompany(id).unwrap();
      toast.success('Entreprise supprimée.');
      window.location.href = '/entreprises';
    } catch {
      toast.error('Échec de la suppression.');
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  // Save edits
  const soumettreEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyErrors(undefined);
    try {
      if (!form.name || !form.name.trim()) {
        setCompanyErrors({ name: ['Le nom est obligatoire.'] });
        return;
      }
      await updateCompany({ id, ...form }).unwrap();
      toast.success('Entreprise mise à jour.');
      setIsEditOpen(false);
      refetchCompany();
    } catch (err: any) {
      const apiErrors: ApiErrors = err?.data?.errors;
      if (apiErrors) setCompanyErrors(apiErrors);
      else toast.error('Échec de la mise à jour.');
    }
  };

  // Contacts list/filter
  const [contactPage, setContactPage] = useState(1);
  const [contactPerPage] = useState(10);
  const [contactSearch, setContactSearch] = useState('');

  const { data: contactData, isFetching: isFetchingContacts, refetch: refetchContacts } = useGetCompanyContactsQuery({
    companyId: id, page: contactPage, per_page: contactPerPage, search: contactSearch
  });

  const contacts = (contactData as any)?.data ?? [];
  const contactsTotal = (contactData as any)?.total ?? (contactData as any)?.meta?.total ?? contacts.length;
  const contactsLastPage = (contactData as any)?.last_page ?? (contactData as any)?.meta?.last_page ?? 1;
  const contactsCurrentPage = (contactData as any)?.current_page ?? (contactData as any)?.meta?.current_page ?? contactPage;

  // Contacts mutations - Using generic hooks
  const [createContact, { isLoading: isCreatingContact }] = useAddContactMutation();
  const [updateContact, { isLoading: isUpdatingContact }] = useUpdateContactMutation();
  const [deleteContact, { isLoading: isDeletingContact }] = useDeleteContactMutation();
  const [detachCompanyContact, { isLoading: isDetaching }] = useDetachCompanyContactMutation();

  // Contact modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [contactErrors, setContactErrors] = useState<ApiErrors>(undefined);

  const openCreateContact = () => {
    setEditingContact(null);
    setContactErrors(undefined);
    setIsContactModalOpen(true);
  };
  const openEditContact = (c: any) => {
    setEditingContact(c);
    setContactErrors(undefined);
    setIsContactModalOpen(true);
  };

  const askDeleteContact = (c: any) => {
    setContactToDelete(c);
    setIsContactDeleteDialogOpen(true);
  };

  // Contact delete confirmation
  const [isContactDeleteDialogOpen, setIsContactDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<any | null>(null);

  const handleDetachOnly = async () => {
    if (!contactToDelete) return;
    try {
      await detachCompanyContact({ companyId: id, contactId: contactToDelete.id }).unwrap();
      toast.success('Contact détaché de l\'entreprise.');
      setIsContactDeleteDialogOpen(false);
      setContactToDelete(null);
      refetchContacts();
    } catch {
      toast.error('Échec du détachement.');
    }
  };

  // Permanent deletion - Using generic hook
  const handleDeleteFully = async () => {
    if (!contactToDelete) return;
    try {
      await deleteContact(contactToDelete.id).unwrap();
      toast.success('Contact supprimé définitivement.');
      setIsContactDeleteDialogOpen(false);
      setContactToDelete(null);
      refetchContacts();
    } catch {
      toast.error('Échec de la suppression du contact.');
    }
  };

  // Attach existing contacts modal
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachSearch, setAttachSearch] = useState('');
  const [attachPage, setAttachPage] = useState(1);
  const [attachPerPage] = useState(10);
  const [includeAssigned] = useState(false);

  const { data: unassignedData, isFetching: isFetchingUnassigned } = useGetUnassignedContactsQuery({
    page: attachPage, per_page: attachPerPage, search: attachSearch, includeAssigned
  });

  const unassigned = (unassignedData as any)?.data ?? [];
  const unassignedTotal = (unassignedData as any)?.total ?? (unassignedData as any)?.meta?.total ?? unassigned.length;
  const unassignedLastPage = (unassignedData as any)?.last_page ?? (unassignedData as any)?.meta?.last_page ?? 1;
  const unassignedCurrentPage = (unassignedData as any)?.current_page ?? (unassignedData as any)?.meta?.current_page ?? attachPage;

  const [attachCompanyContact, { isLoading: isAttaching }] = useAttachCompanyContactMutation();

  const openAttachModal = () => {
    setAttachSearch('');
    setAttachPage(1);
    setIsAttachModalOpen(true);
  };
  const doAttach = async (contactId: number) => {
    try {
      await attachCompanyContact({ companyId: id, contactId }).unwrap();
      toast.success('Contact associé à l\'entreprise.');
      setIsAttachModalOpen(false);
      refetchContacts();
    } catch (err: any) {
      const apiErrors: ApiErrors = err?.data?.errors;
      if (apiErrors) {
        const firstKey = Object.keys(apiErrors)[0];
        toast.error((apiErrors as any)[firstKey] ?? "Échec de l'association.");
      } else {
        toast.error("Échec de l'association du contact.");
      }
    }
  };

  // Documents list
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  const [fetchDocuments] = useLazyGetCompanyDocumentsQuery();
  const [unlinkDocument] = useUnlinkDocumentMutation();

  const loadDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const result = await fetchDocuments({ company_id: id, per_page: 100 }).unwrap();
      setDocuments(result.data || []);
    } catch {
      toast.error('Impossible de charger les documents.');
    } finally {
      setDocumentsLoading(false);
    }
  };
  useEffect(() => { if (id) loadDocuments(); }, [id]);

  // Document details modal (+ versions)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsDoc, setDetailsDoc] = useState<any | null>(null);
  const [docVersions, setDocVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const fetchDocumentFull = async (docId: number) => {
    try {
      const resp = await fetch(`/api/documents/${docId}`, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!resp.ok) return null;
      return await resp.json(); // { data: {...} }
    } catch { return null; }
  };
  const fetchDocumentVersions = async (docId: number) => {
    setVersionsLoading(true);
    try {
      // Adapt URL if needed, e.g. /api/documents/{id}/versions
      const resp = await fetch(`/api/documents/${docId}/versions`, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!resp.ok) { setDocVersions([]); return; }
      const payload = await resp.json();
      const arr = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
      setDocVersions(arr);
    } catch {
      setDocVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const openDetailsFromList = async (doc: Document) => {
    // Open immediately with minimal doc
    setDetailsDoc(doc);
    setDetailsOpen(true);
    // Load full doc (wrapped {data:...})
    const full = await fetchDocumentFull(doc.id);
    if (full?.data) setDetailsDoc(full);
    // Load versions if endpoint available
    fetchDocumentVersions(doc.id);
  };

  // Doc delete/detach confirmation
  const [isDocDeleteDialogOpen, setIsDocDeleteDialogOpen] = useState(false);
  const [docDeleteTarget, setDocDeleteTarget] = useState<Document | null>(null);
  const [deleteMode, setDeleteMode] = useState<'detach' | 'delete'>('detach');

  const confirmDocAction = async () => {
    if (!docDeleteTarget) return;
    try {
      if (deleteMode === 'detach') {
        await unlinkDocument({ id: docDeleteTarget.id, payload: { type: 'company', id } }).unwrap();
        toast.success('Document détaché de l\'entreprise.');
      } else {
        const resp = await fetch(`/api/documents/${docDeleteTarget.id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!resp.ok) throw new Error();
        toast.success('Document supprimé définitivement.');
        if ((detailsDoc?.data?.id ?? detailsDoc?.id) === docDeleteTarget.id) {
          setDetailsOpen(false);
          setDetailsDoc(null);
        }
      }
      setIsDocDeleteDialogOpen(false);
      setDocDeleteTarget(null);
      loadDocuments();
    } catch {
      toast.error('Action impossible.');
    }
  };

  // Search providers used by modals
  const searchCompanies = async (q: string) => {
    try {
      if (!q || q.trim().length < 2) return [];
      const resp = await fetch(`/api/companies/search?q=${encodeURIComponent(q)}`, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!resp.ok) return [];
      const arr = await resp.json();
      return Array.isArray(arr)
        ? arr.map((x: any) => ({ id: x.id, name: x.name ?? x.label ?? x.title ?? String(x.id) }))
        : [];
    } catch { return []; }
  };
  const searchContacts = async (q: string) => {
    try {
      if (!q || q.trim().length < 2) return [];
      const resp = await fetch(`/api/contacts/search?q=${encodeURIComponent(q)}`, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!resp.ok) return [];
      const arr = await resp.json();
      return Array.isArray(arr)
        ? arr.map((x: any) => ({ id: x.id, name: x.name ?? (`${x.first_name ?? ''} ${x.last_name ?? ''}`.trim() || String(x.id)) }))
        : [];
    } catch { return []; }
  };

  // Upload modal
  const [openUpload, setOpenUpload] = useState(false);
  const [uploadDocument] = useUploadDocumentMutation();
  const [uploadLinks, setUploadLinks] = useState<Array<{ type:'company'|'contact'; id:number; name:string; role?:string }>>([]);
  const ouvrirUpload = () => {
    setUploadLinks([{ type: 'company', id, name: (company?.name ?? 'Entreprise') as string }]);
    setOpenUpload(true);
  };
  const fermerUpload = () => setOpenUpload(false);
  const onUploaded = async () => {
    toast.success('Document téléversé.');
    fermerUpload();
    loadDocuments();
  };

  // Helpers to normalize Contact payload (avoid undefined -> null + handle coordinates)
  const normalizeContactPayload = (vals: any) => {
    const toNull = (v: any) => (v === '' || v === undefined ? null : v);

    // Function to convert to number or null
    const toNumericOrNull = (v: any) => {
      if (v === '' || v === undefined || v === null) return null;
      const num = parseFloat(v);
      return isNaN(num) ? null : num;
    };

    return {
      name: vals.name,
      email: toNull(vals.email),
      phone: toNull(vals.phone),
      address: toNull(vals.address),
      status: toNull(vals.status),
      // Add coordinates handling
      latitude: toNumericOrNull(vals.latitude),
      longitude: toNumericOrNull(vals.longitude),
      // add other fields if your ContactForm provides them (city, zipcode, etc.)
    };
  };

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Entreprise</h2>}>
      <Head title="Entreprise" />
      <div className="p-6 space-y-6">
        {isLoading && <div className="text-gray-500">Chargement…</div>}

        {!isLoading && company && (
          <>
            {/* Header */}
            <Card>
              <CardContent className="p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-blue-50 p-2">
                    <Building2 className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">{company.name}</div>
                    <div className="text-sm text-gray-600">{company.domain ?? 'Domaine non renseigné'}</div>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <Link href="/entreprises">
                    <Button variant="outline" className="gap-1">
                      <ArrowLeft className="h-4 w-4" />
                      Retour à la liste
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={demanderSuppression} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            {/* Main Info */}
            <Card>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Secteur</div>
                  <div className="text-sm">{company.industry ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Taille</div>
                  <div className="text-sm">{company.size ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Créé par</div>
                  <div className="text-sm">{company.owner?.name ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Statut</div>
                  <div className="text-sm">
                    <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', companyBadgeClasses(company.status)].join(' ')}>
                      {company.status}
                    </span>
                  </div>
                </div>
                <div className="lg:col-span-4">
                  <div className="text-xs text-gray-500">Contacts liés</div>
                  <div className="text-sm">{typeof company.contacts_count === 'number' ? company.contacts_count : contactsTotal}</div>
                </div>
              </CardContent>
            </Card>

            {/* Address + Notes */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Adresse</div>
                    <div className="text-sm">{company.address ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Ville</div>
                    <div className="text-sm">{company.city ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Code postal</div>
                    <div className="text-sm">{company.zipcode ?? '-'}</div>
                  </div>
                  <div className="md:col-span-3">
                    <div className="text-xs text-gray-500">Pays</div>
                    <div className="text-sm">{company.country ?? '-'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Notes</div>
                  <div className="text-sm whitespace-pre-wrap">{company.notes ?? '—'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Company contacts */}
            <Card id="company-contacts-section">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">Contacts de l'entreprise</div>
                  <div className="text-xs text-gray-500">(total: {contactsTotal})</div>
                  <div className="flex-1" />
                  <Input
                    className="w-64"
                    placeholder="Rechercher (nom, email, téléphone)"
                    value={contactSearch}
                    onChange={(e) => { setContactSearch(e.target.value); setContactPage(1); }}
                  />
                  <Button className="gap-2" onClick={openCreateContact}>
                    <Plus className="h-4 w-4" /> Nouveau contact
                  </Button>
                  <Button variant="outline" onClick={openAttachModal}>
                    Ajouter existant
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="px-4 py-2">Nom</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Téléphone</th>
                        <th className="px-4 py-2 w-[160px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isFetchingContacts && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            <div className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Chargement...
                            </div>
                          </td>
                        </tr>
                      )}

                      {!isFetchingContacts && contacts.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                            Aucun contact trouvé.
                          </td>
                        </tr>
                      )}

                      {contacts.map((c: any) => (
                          <tr key={c.id} className="border-t hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                            <td className="px-4 py-2 text-gray-700">{c.email}</td>
                            <td className="px-4 py-2 text-gray-700">{c.phone ?? '-'}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1.5">
                                <Button
                                  title="Modifier"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-80 hover:opacity-100"
                                  onClick={() => openEditContact(c)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  title="Supprimer"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 opacity-80 hover:opacity-100"
                                  onClick={() => askDeleteContact(c)}
                                  disabled={isDeletingContact || isDetaching}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Contacts: {contactsTotal}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={contactsCurrentPage <= 1 || isFetchingContacts}
                      onClick={() => setContactPage((p) => Math.max(1, p - 1))}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Précédent
                    </Button>
                    <div className="px-2 py-1 text-sm">Page {contactsCurrentPage} / {contactsLastPage}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={contactsCurrentPage >= contactsLastPage || isFetchingContacts}
                      onClick={() => setContactPage((p) => Math.min(contactsLastPage, p + 1))}
                      className="gap-1"
                    >
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Linked documents */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">Documents liés</div>
                </div>

                {documentsLoading ? (
                  <div className="text-gray-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des documents...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-gray-400">Aucun document lié à cette entreprise.</div>
                ) : (
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-left">
                          <th className="px-4 py-2">Nom</th>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Taille</th>
                          <th className="px-4 py-2">Créé le</th>
                          <th className="px-4 py-2 w-[160px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => (
                          <tr key={doc.id} className="border-t hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-900">{doc.name}</td>
                            <td className="px-4 py-2 text-gray-700">{doc.extension?.toUpperCase() || doc.mime_type}</td>
                            <td className="px-4 py-2 text-gray-700">{(doc.size_bytes / 1024).toFixed(1)} KB</td>
                            <td className="px-4 py-2 text-gray-700">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1.5">
                                <Button
                                  title="Détails"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-80 hover:opacity-100"
                                  onClick={() => openDetailsFromList(doc)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  title="Détacher"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 opacity-80 hover:opacity-100"
                                  onClick={() => { setDocDeleteTarget(doc); setDeleteMode('detach'); setIsDocDeleteDialogOpen(true); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company edit modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogContent className="sm:max-w-[700px] p-0 [&>button[type='button']]:z-30" style={{ overflow: 'hidden' }}>
                <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)', minHeight: 300 }}>
                  <div className="px-6 py-4">
                    <DialogHeader className="p-0">
                      <DialogTitle>Modifier l'entreprise</DialogTitle>
                      <DialogDescription>Mettre à jour les informations et l'adresse.</DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="px-6 py-4" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
                    <form id="company-edit-form" onSubmit={soumettreEdition} className="space-y-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-700">Statut</label>
                          <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', companyBadgeClasses(form.status as string)].join(' ')}>{form.status ?? '—'}</span>
                        </div>
                        <Select
                          value={(form.status as string) ?? (companyStatusOptions[0]?.value ?? 'Prospect')}
                          onValueChange={(v) => setForm((f) => ({ ...f, status: v as Company['status'] }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner un statut" /></SelectTrigger>
                          <SelectContent>
                            {companyStatusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {companyErrors?.status && <p className="text-red-500 text-sm mt-1">{companyErrors.status as string}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm text-gray-700">Nom</label>
                          <Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                          {companyErrors?.name && <p className="text-red-500 text-sm mt-1">{Array.isArray(companyErrors.name) ? companyErrors.name : companyErrors.name}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-sm text-gray-700">Domaine</label>
                          <Input value={form.domain ?? ''} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="ex: exemple.com" />
                          {companyErrors?.domain && <p className="text-red-500 text-sm mt-1">{companyErrors.domain as string}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-sm text-gray-700">Secteur</label>
                          <Input value={form.industry ?? ''} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} placeholder="ex: SaaS, Retail, ..." />
                          {companyErrors?.industry && <p className="text-red-500 text-sm mt-1">{companyErrors.industry as string}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-sm text-gray-700">Taille</label>
                          <Input value={form.size ?? ''} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="ex: 11-50" />
                          {companyErrors?.size && <p className="text-red-500 text-sm mt-1">{companyErrors.size as string}</p>}
                        </div>
                      </div>

                      <CompanyAddressMapSplit
                        address={form.address ?? ''}
                        city={form.city ?? ''}
                        zipcode={form.zipcode ?? ''}
                        country={form.country ?? ''}
                        latitude={form.latitude ?? null}
                        longitude={form.longitude ?? null}
                        onChange={(vals) => setForm((f) => ({ ...f, ...vals }))}
                        mapHeightClass="h-56"
                      />

                      <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-700">Notes</label>
                        <textarea
                          className="w-full border rounded-md p-2 text-sm"
                          rows={4}
                          value={form.notes ?? ''}
                          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        />
                        {companyErrors?.notes && <p className="text-red-500 text-sm mt-1">{Array.isArray(companyErrors.notes) ? (companyErrors.notes as string[])[0] : (companyErrors.notes as string) }</p>}
                      </div>
                    </form>
                  </div>

                  <div className="px-6 py-3" style={{ flex: '0 0 auto', background: 'white', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
                      <Button type="submit" form="company-edit-form">Enregistrer</Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add existing contact modal */}
            <Dialog open={isAttachModalOpen} onOpenChange={setIsAttachModalOpen}>
              <DialogContent className="sm:max-w-[700px] p-0 [&>button[type='button']]:z-30" style={{ overflow: 'hidden' }}>
                <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
                  <div className="px-6 py-4">
                    <DialogHeader className="p-0">
                      <DialogTitle>Ajouter un contact existant</DialogTitle>
                      <DialogDescription>Sélectionnez un contact à associer à l'entreprise.</DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="px-6 pb-3 flex items-center gap-2">
                    <Input
                      className="w-64"
                      placeholder="Rechercher (nom, email, téléphone)"
                      value={attachSearch}
                      onChange={(e) => { setAttachSearch(e.target.value); setAttachPage(1); }}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 pb-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr className="text-left">
                            <th className="px-4 py-2">Nom</th>
                            <th className="px-4 py-2">Email</th>
                            <th className="px-4 py-2">Téléphone</th>
                            <th className="px-4 py-2 w-[120px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isFetchingUnassigned && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                <div className="inline-flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Chargement...
                                </div>
                              </td>
                            </tr>
                          )}

                          {!isFetchingUnassigned && unassigned.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Aucun contact à afficher.</td>
                            </tr>
                          )}

                          {unassigned.map((c: any) => (
                            <tr key={c.id} className="border-t hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                              <td className="px-4 py-2 text-gray-700">{c.email}</td>
                              <td className="px-4 py-2 text-gray-700">{c.phone ?? '-'}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" disabled={isAttaching} onClick={() => doAttach(c.id)}>Associer</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-gray-600">Résultats: {unassignedTotal}</div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={unassignedCurrentPage <= 1 || isFetchingUnassigned} onClick={() => setAttachPage((p) => Math.max(1, p - 1))}>
                          <ChevronLeft className="h-4 w-4" /> Précédent
                        </Button>
                        <div className="px-2 py-1 text-sm">Page {unassignedCurrentPage} / {unassignedLastPage}</div>
                        <Button variant="outline" size="sm" disabled={unassignedCurrentPage >= unassignedLastPage || isFetchingUnassigned} onClick={() => setAttachPage((p) => Math.min(unassignedLastPage, p + 1))}>
                          Suivant <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Contact delete/detach confirmation */}
            <AlertDialog open={isContactDeleteDialogOpen} onOpenChange={setIsContactDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer le contact ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Choisir une action: détacher le contact de l'entreprise (le contact restera accessible ailleurs), ou le supprimer définitivement.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <Button variant="outline" onClick={handleDetachOnly} disabled={isDetaching}>Détacher de l'entreprise</Button>
                  <AlertDialogAction onClick={handleDeleteFully} className="bg-red-600 hover:bg-red-700" disabled={isDeletingContact}>Supprimer définitivement</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Company delete confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>Voulez-vous vraiment supprimer l'entreprise "{company.name}" ? Cette action est irréversible.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmerSuppression} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Row-level document delete/detach confirmation */}
            <AlertDialog open={isDocDeleteDialogOpen} onOpenChange={setIsDocDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Que faire avec ce document ?</AlertDialogTitle>
                  <AlertDialogDescription>Choisir une action: détacher le document de l'entreprise (le document restera disponible ailleurs), ou le supprimer définitivement.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <Button variant="outline" onClick={() => { setDeleteMode('detach'); confirmDocAction(); }}>Détacher de l'entreprise</Button>
                  <AlertDialogAction onClick={() => { setDeleteMode('delete'); confirmDocAction(); }} className="bg-red-600 hover:bg-red-700">Supprimer définitivement</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Document details modal - simple opening + enrichment + versions loaded separately */}
            <DocumentDetailsModal
              open={detailsOpen}
              onOpenChange={(o) => setDetailsOpen(o)}
              document={(detailsDoc && (detailsDoc.data ?? detailsDoc)) as any}
              onAfterChange={loadDocuments}
              searchCompanies={searchCompanies}
              searchContacts={searchContacts}
              // If your component accepts a prop for versions, pass it:
              extraVersions={docVersions}
              loadingVersions={versionsLoading}
              currentCompanyId={id}
            />

            {/* Upload modal */}
            <UploadModal
              isOpen={openUpload}
              onClose={fermerUpload}
              onUploaded={onUploaded}
              searchCompanies={searchCompanies}
              searchContacts={searchContacts}
              initialLinks={uploadLinks}
              onLinksChange={setUploadLinks}
              upload={async (form: FormData) => {
                await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
                return await uploadDocument(form).unwrap();
              }}
            />

            {/* Contact create/edit modal - Modified logic to use generic hooks */}
            <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
              <DialogContent className="sm:max-w-[600px] p-0" style={{ overflow: 'hidden' }}>
                <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)', minHeight: 300 }}>
                  <div className="px-6 py-4">
                    <DialogHeader className="p-0">
                      <DialogTitle>{editingContact ? 'Modifier un contact' : 'Créer un contact'}</DialogTitle>
                      <DialogDescription>
                        {editingContact ? 'Mettre à jour les informations du contact.' : 'Renseignez les informations du nouveau contact.'}
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  <div className="px-6 pb-4" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
                    <ContactForm
                      initialData={editingContact ?? undefined}
                      onSubmit={async (values) => {
                        try {
                          const payload = normalizeContactPayload(values);
                          if (editingContact) {
                            // Use generic route for update
                            await updateContact({ id: editingContact.id, ...payload }).unwrap();
                            toast.success('Contact mis à jour.');
                          } else {
                            // For creation, add company_id to payload
                            await createContact({ ...payload, company_id: id }).unwrap();
                            toast.success('Contact créé et associé.');
                          }
                          setIsContactModalOpen(false);
                          setEditingContact(null);
                          refetchContacts();
                        } catch (err: any) {
                          const apiErrors: ApiErrors = err?.data?.errors;
                          if (apiErrors) {
                            setContactErrors(apiErrors);
                            toast.error('Veuillez corriger les erreurs du formulaire.');
                          } else {
                            toast.error("Échec de l'enregistrement du contact.");
                          }
                        }
                      }}
                      isLoading={isCreatingContact || isUpdatingContact}
                      errors={contactErrors as any}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
