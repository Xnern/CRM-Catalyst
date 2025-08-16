import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
  useGetCompanyQuery,
  useDeleteCompanyMutation,
  useUpdateCompanyMutation,
  // Contacts list/CRUD
  useGetCompanyContactsQuery,
  useCreateCompanyContactMutation,
  useUpdateCompanyContactMutation,
  useDeleteCompanyContactMutation,
  // Unassigned list + attach existing
  useGetUnassignedContactsQuery,
  useAttachCompanyContactMutation,
  useDetachCompanyContactMutation,
  // Meta
  useGetCompanyStatusOptionsQuery,
  useGetContactStatusOptionsQuery,
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
  Plus, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';
import CompanyAddressMapSplit, { SplitAddress } from '@/Components/Companies/CompanyAddressMapSplit';
import ContactForm from '@/Components/ContactForm';
import { Company } from '@/types/Company';

// Types
type Props = { auth: any; id: number };
type ApiErrors = Record<string, string[] | string> | undefined;

// Badge helpers (entreprise)
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

// Badge helpers (contact) — normalisation pour robustesse
const contactBadgeClasses = (raw?: string) => {
  if (!raw) return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300';
  const s = raw
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/é|è|ê/g, 'e')
    .replace(/à|â/g, 'a')
    .replace(/î|ï/g, 'i')
    .replace(/ô/g, 'o')
    .replace(/û|ü/g, 'u')
    .replace(/ç/g, 'c');

  switch (s) {
    case 'nouveau':
      return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200';
    case 'qualification':
      return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-200';
    case 'proposition_envoyee':
      return 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200';
    case 'negociation':
      return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200';
    case 'converti':
      return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200';
    case 'perdu':
      return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200';
    default:
      return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300';
  }
};

export default function CompanyShow({ auth, id }: Props) {
  // Company base data
  const { data, isLoading } = useGetCompanyQuery(id);
  const [deleteCompany] = useDeleteCompanyMutation();
  const [updateCompany] = useUpdateCompanyMutation();

  // Modales globales (entreprise)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Company edit form + errors
  const [form, setForm] = useState<Partial<Company> & SplitAddress & { owner_id: number | null }>({
    name: '',
    domain: '',
    industry: '',
    size: '',
    status: 'Prospect',
    owner_id: null,
    address: '',
    city: '',
    zipcode: '',
    country: '',
    notes: '',
    latitude: null,
    longitude: null
  });
  const [companyErrors, setCompanyErrors] = useState<ApiErrors>(undefined);

  // Meta status options
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

  const { data: contactStatusesRes } = useGetContactStatusOptionsQuery();
  const contactStatusOptions = useMemo(
    () =>
      (contactStatusesRes?.data && Array.isArray(contactStatusesRes.data) && contactStatusesRes.data.length > 0)
        ? contactStatusesRes.data
        : [
            { value: 'nouveau', label: 'Nouveau' },
            { value: 'qualification', label: 'Qualification' },
            { value: 'proposition_envoyee', label: 'Proposition envoyée' },
            { value: 'negociation', label: 'Négociation' },
            { value: 'converti', label: 'Converti' },
            { value: 'perdu', label: 'Perdu' },
          ],
    [contactStatusesRes?.data]
  );

  // Hydrate form when data loads
  useMemo(() => {
    if (data) {
      setForm({
        id: data.id,
        name: data.name,
        domain: data.domain ?? '',
        industry: data.industry ?? '',
        size: data.size ?? '',
        status: data.status,
        owner_id: (data as any).owner_id ?? data.owner?.id ?? null,
        address: data.address ?? '',
        city: data.city ?? '',
        zipcode: data.zipcode ?? '',
        country: data.country ?? '',
        notes: data.notes ?? '',
        latitude: (data as any).latitude ?? null,
        longitude: (data as any).longitude ?? null
      });
      setCompanyErrors(undefined);
    }
  }, [data]);

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

  const soumettreEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyErrors(undefined);
    try {
      if (!form.name || !form.name.trim()) {
        setCompanyErrors({ name: ['Le nom est obligatoire.'] });
        return;
      }
      // On envoie owner_id pour mise à jour du propriétaire
      await updateCompany({ id, ...form }).unwrap();
      toast.success('Entreprise mise à jour.');
      setIsEditOpen(false);
    } catch (err: any) {
      const apiErrors: ApiErrors = err?.data?.errors;
      if (apiErrors) setCompanyErrors(apiErrors);
      else toast.error('Échec de la mise à jour.');
    }
  };

  // Contacts list/CRUD state
  const [contactPage, setContactPage] = useState(1);
  const [contactPerPage] = useState(10);
  const [contactSearch, setContactSearch] = useState('');

  const { data: contactData, isFetching: isFetchingContacts } = useGetCompanyContactsQuery({
    companyId: id, page: contactPage, per_page: contactPerPage, search: contactSearch
  });

  const contacts = (contactData as any)?.data ?? [];
  const contactsTotal = (contactData as any)?.total ?? contacts.length;
  const contactsLastPage = (contactData as any)?.last_page ?? 1;
  const contactsCurrentPage = (contactData as any)?.current_page ?? contactPage;

  const [createContact, { isLoading: isCreatingContact }] = useCreateCompanyContactMutation();
  const [updateContact, { isLoading: isUpdatingContact }] = useUpdateCompanyContactMutation();
  const [deleteCompanyContact, { isLoading: isDeletingContact }] = useDeleteCompanyContactMutation();
  const [detachCompanyContact, { isLoading: isDetaching }] = useDetachCompanyContactMutation();

  // Modale Contact CRUD
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [contactErrors, setContactErrors] = useState<ApiErrors>(undefined);

  // Modale de confirmation suppression/détachement
  const [isContactDeleteDialogOpen, setIsContactDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<any | null>(null);

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

  const handleDetachOnly = async () => {
    if (!contactToDelete) return;
    try {
      await detachCompanyContact({ companyId: id, contactId: contactToDelete.id }).unwrap();
      toast.success('Contact détaché de l’entreprise.');
    } catch {
      toast.error('Échec du détachement.');
    } finally {
      setIsContactDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  const handleDeleteFully = async () => {
    if (!contactToDelete) return;
    try {
      await deleteCompanyContact({ companyId: id, contactId: contactToDelete.id }).unwrap();
      toast.success('Contact supprimé définitivement.');
    } catch {
      toast.error('Échec de la suppression du contact.');
    } finally {
      setIsContactDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  // Attach existing contacts (unassigned)
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachSearch, setAttachSearch] = useState('');
  const [attachPage, setAttachPage] = useState(1);
  const [attachPerPage] = useState(10);
  const [includeAssigned] = useState(false);

  const { data: unassignedData, isFetching: isFetchingUnassigned } = useGetUnassignedContactsQuery({
    page: attachPage, per_page: attachPerPage, search: attachSearch, includeAssigned
  });

  const unassigned = (unassignedData as any)?.data ?? [];
  const unassignedTotal = (unassignedData as any)?.total ?? unassigned.length;
  const unassignedLastPage = (unassignedData as any)?.last_page ?? 1;
  const unassignedCurrentPage = (unassignedData as any)?.current_page ?? attachPage;

  const [attachCompanyContact, { isLoading: isAttaching }] = useAttachCompanyContactMutation();

  const openAttachModal = () => {
    setAttachSearch('');
    setAttachPage(1);
    setIsAttachModalOpen(true);
  };

  const doAttach = async (contactId: number) => {
    try {
      await attachCompanyContact({ companyId: id, contactId }).unwrap();
      toast.success('Contact associé à l’entreprise.');
      setIsAttachModalOpen(false);
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

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Entreprise</h2>}>
      <Head title="Entreprise" />

      <div className="p-6 space-y-6">
        {isLoading && <div className="text-gray-500">Chargement…</div>}

        {!isLoading && data && (
          <>
            {/* En-tête */}
            <Card>
              <CardContent className="p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-blue-50 p-2">
                    <Building2 className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">{data.name}</div>
                    <div className="text-sm text-gray-600">{data.domain ?? 'Domaine non renseigné'}</div>
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

            {/* Infos principales */}
            <Card>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Secteur</div>
                  <div className="text-sm">{data.industry ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Taille</div>
                  <div className="text-sm">{data.size ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Créé par</div>
                  <div className="text-sm">
                    {data.owner?.name ?? (data as any).owner_name ?? (data as any).owner_id ?? '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Statut</div>
                  <div className="text-sm">
                    <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', companyBadgeClasses(data.status)].join(' ')}>
                      {data.status}
                    </span>
                  </div>
                </div>
                <div className="lg:col-span-4">
                  <div className="text-xs text-gray-500">Contacts liés</div>
                  <div className="text-sm">
                    {typeof (data as any).contacts_count === 'number'
                      ? (data as any).contacts_count
                      : (isFetchingContacts ? (
                        <span className="inline-flex items-center gap-2 text-gray-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Chargement…
                        </span>
                      ) : (contactsTotal ?? 0))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Adresse + Notes */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Adresse</div>
                    <div className="text-sm">{data.address ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Ville</div>
                    <div className="text-sm">{data.city ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Code postal</div>
                    <div className="text-sm">{data.zipcode ?? '-'}</div>
                  </div>
                  <div className="md:col-span-3">
                    <div className="text-xs text-gray-500">Pays</div>
                    <div className="text-sm">{data.country ?? '-'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Notes</div>
                  <div className="text-sm whitespace-pre-wrap">{data.notes ?? '—'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Contacts de l’entreprise */}
            <Card id="company-contacts-section">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">Contacts de l’entreprise</div>
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
                        <th className="px-4 py-2">Statut</th>
                        <th className="px-4 py-2 w-[160px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isFetchingContacts && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            <div className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Chargement...
                            </div>
                          </td>
                        </tr>
                      )}

                      {!isFetchingContacts && contacts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                            Aucun contact trouvé.
                          </td>
                        </tr>
                      )}

                      {contacts.map((c: any) => {
                        // Normaliser le statut pour couleurs/labels robustes
                        const normalized = (c.status ?? '')
                          .toString()
                          .trim()
                          .toLowerCase()
                          .replace(/\s+/g, '_')
                          .replace(/é|è|ê/g, 'e')
                          .replace(/à|â/g, 'a')
                          .replace(/î|ï/g, 'i')
                          .replace(/ô/g, 'o')
                          .replace(/û|ü/g, 'u')
                          .replace(/ç/g, 'c');

                        const label = (contactStatusOptions.find(o => o.value === normalized)?.label) ?? c.status;

                        return (
                          <tr key={c.id} className="border-t hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                            <td className="px-4 py-2 text-gray-700">{c.email}</td>
                            <td className="px-4 py-2 text-gray-700">{c.phone ?? '-'}</td>
                            <td className="px-4 py-2">
                              <span
                                className={[
                                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                  contactBadgeClasses(normalized),
                                ].join(' ')}
                              >
                                {label}
                              </span>
                            </td>
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
                        );
                      })}
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

            {/* Modale Édition Entreprise */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogContent
                className="sm:max-w-[700px] p-0 [&>button[type='button']]:z-30"
                style={{ overflow: 'hidden' }}
              >
                <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)', minHeight: 300 }}>
                  <div className="px-6 py-4">
                    <DialogHeader className="p-0">
                      <DialogTitle>Modifier l’entreprise</DialogTitle>
                      <DialogDescription>Mettre à jour les informations et l’adresse.</DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="px-6 py-4" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
                    <form id="company-edit-form" onSubmit={soumettreEdition} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-gray-700">Nom</label>
                          <Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                          {companyErrors?.name && <p className="text-red-500 text-sm mt-1">{Array.isArray(companyErrors.name) ? companyErrors.name[0] : companyErrors.name}</p>}
                        </div>
                        <div>
                          <label className="text-sm text-gray-700">Domaine</label>
                          <Input value={form.domain ?? ''} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="ex: exemple.com" />
                          {companyErrors?.domain && <p className="text-red-500 text-sm mt-1">{companyErrors.domain as string}</p>}
                        </div>
                        <div>
                          <label className="text-sm text-gray-700">Secteur</label>
                          <Input value={form.industry ?? ''} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} placeholder="ex: SaaS, Retail, ..." />
                          {companyErrors?.industry && <p className="text-red-500 text-sm mt-1">{companyErrors.industry as string}</p>}
                        </div>
                        <div>
                          <label className="text-sm text-gray-700">Taille</label>
                          <Input value={form.size ?? ''} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="ex: 11-50" />
                          {companyErrors?.size && <p className="text-red-500 text-sm mt-1">{companyErrors.size as string}</p>}
                        </div>
                        <div>
                          <label className="text-sm text-gray-700">Statut</label>
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
                        <div>
                          <label className="text-sm text-gray-700">ID Propriétaire</label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={(form as any).owner_id ?? ''}
                              onChange={(e) => setForm((f) => ({ ...f, owner_id: e.target.value ? Number(e.target.value) : null }))}
                              placeholder="ex: 1"
                            />
                            {(data as any)?.owner?.name && (
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {(data as any).owner.name}
                              </span>
                            )}
                          </div>
                          {companyErrors?.owner_id && <p className="text-red-500 text-sm mt-1">{companyErrors.owner_id as string}</p>}
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

                      <div>
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
                      <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" form="company-edit-form">
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modale Contact (création/édition) */}
            <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
              <DialogContent
                className="sm:max-w-[560px] p-0 [&>button[type='button']]:z-30"
                style={{ overflow: 'hidden' }}
              >
                <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
                  <div className="px-6 py-4">
                    <DialogHeader className="p-0">
                      <DialogTitle>{editingContact ? 'Modifier un contact' : 'Nouveau contact'}</DialogTitle>
                      <DialogDescription>Renseigner les informations du contact.</DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    <ContactForm
                      initialData={editingContact ? {
                        id: editingContact.id,
                        name: editingContact.name,
                        email: editingContact.email,
                        phone: editingContact.phone,
                        address: editingContact.address,
                        latitude: editingContact.latitude,
                        longitude: editingContact.longitude,
                        user_id: editingContact.user_id,
                        status: editingContact.status,
                        created_at: editingContact.created_at,
                        updated_at: editingContact.updated_at,
                        user: (editingContact as any).user ?? null,
                      } : null}
                      isLoading={isCreatingContact || isUpdatingContact}
                      errors={contactErrors as any}
                      statusOptions={contactStatusOptions}
                      onSubmit={async (values) => {
                        setContactErrors(undefined);
                        try {
                          if (editingContact) {
                            await updateContact({ companyId: id, contactId: editingContact.id, body: values }).unwrap();
                            toast.success('Contact mis à jour.');
                          } else {
                            await createContact({ companyId: id, body: values }).unwrap();
                            toast.success('Contact créé.');
                          }
                          setIsContactModalOpen(false);
                        } catch (err: any) {
                          const apiErrors: ApiErrors = err?.data?.errors;
                          if (apiErrors) setContactErrors(apiErrors);
                          else toast.error('Échec de la sauvegarde du contact.');
                        }
                      }}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modale Ajouter un contact existant */}
            <Dialog open={isAttachModalOpen} onOpenChange={setIsAttachModalOpen}>
              <DialogContent
                className="sm:max-w-[700px] p-0 [&>button[type='button']]:z-30"
                style={{ overflow: 'hidden' }}
              >
                <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
                  <div className="px-6 py-4">
                    <DialogHeader className="p-0">
                      <DialogTitle>Ajouter un contact existant</DialogTitle>
                      <DialogDescription>Sélectionnez un contact à associer à l’entreprise.</DialogDescription>
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
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                Aucun contact à afficher.
                              </td>
                            </tr>
                          )}

                          {unassigned.map((c: any) => (
                            <tr key={c.id} className="border-t hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                              <td className="px-4 py-2 text-gray-700">{c.email}</td>
                              <td className="px-4 py-2 text-gray-700">{c.phone ?? '-'}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isAttaching}
                                    onClick={() => doAttach(c.id)}
                                  >
                                    Associer
                                  </Button>
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
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={unassignedCurrentPage <= 1 || isFetchingUnassigned}
                          onClick={() => setAttachPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" /> Précédent
                        </Button>
                        <div className="px-2 py-1 text-sm">Page {unassignedCurrentPage} / {unassignedLastPage}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={unassignedCurrentPage >= unassignedLastPage || isFetchingUnassigned}
                          onClick={() => setAttachPage((p) => Math.min(unassignedLastPage, p + 1))}
                        >
                          Suivant <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modale confirmation suppression/détachement de contact */}
            <AlertDialog open={isContactDeleteDialogOpen} onOpenChange={setIsContactDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer le contact ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Choisir une action: détacher le contact de l’entreprise (le contact restera accessible ailleurs), ou le supprimer définitivement.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <Button variant="outline" onClick={handleDetachOnly} disabled={isDetaching}>
                    Détacher de l’entreprise
                  </Button>
                  <AlertDialogAction onClick={handleDeleteFully} className="bg-red-600 hover:bg-red-700" disabled={isDeletingContact}>
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Modale confirmation suppression entreprise */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    Voulez-vous vraiment supprimer l’entreprise “{data.name}” ? Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmerSuppression} className="bg-red-600 hover:bg-red-700">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
