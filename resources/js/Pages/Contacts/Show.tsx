import React, { useMemo, useState, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { UploadModal } from '@/Components/Documents/UploadModal';
import { DocumentDetailsModal } from '@/Components/Documents/DocumentDetailsModal';
import { LinkPicker } from '@/Components/Documents/LinkPicker';
// Import for edit modal
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/Components/ui/dialog';
import ContactForm from '@/Components/ContactForm';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/Components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Phone, Mail, MapPin, Loader2, Building2, X, Eye, UploadCloud, MoreHorizontal, Edit } from 'lucide-react';

import {
  useGetContactQuery,
  useDeleteContactMutation,
  useUpdateContactMutation, // Mutation for contact editing
  useUnlinkDocumentFromContactMutation,
  useUploadDocumentMutation,
  useLazySearchCompaniesQuery,
  useLazySearchContactsQuery,
  useAttachCompanyContactMutation,
  useDetachCompanyContactMutation,
} from '@/services/api';

type Props = { auth: any; id: number };

// Interface for validation errors
interface BackendValidationErrors {
  [key: string]: string[];
}

export default function ContactShow({ auth, id }: Props) {
  // Contact with loaded relations
  const { data: contactResp, isLoading: isLoadingContact, refetch: refetchContact } = useGetContactQuery(id, {
    // Force reload on each page visit
    refetchOnMountOrArgChange: true,
  });

  // Extract contact data correctly
  const contact = useMemo(() => {
    return contactResp?.data || contactResp || null;
  }, [contactResp]);

  // Linked company (from direct relation)
  const linkedCompany = useMemo(() => {
    return contact?.company || null;
  }, [contact]);

  // Linked documents (from direct relation)
  const documents = useMemo(() => {
    return contact?.documents || [];
  }, [contact]);

  // Mutations
  const [deleteContact] = useDeleteContactMutation();
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation(); // Mutation for editing
  const [unlinkDocumentFromContact] = useUnlinkDocumentFromContactMutation();
  const [uploadDocument] = useUploadDocumentMutation();

  // Link/detach company (via companies/{company}/contacts/attach|detach routes)
  const [attachCompanyContact, { isLoading: isAttaching }] = useAttachCompanyContactMutation();
  const [detachCompanyContact, { isLoading: isDetaching }] = useDetachCompanyContactMutation();

  // States for edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<any | null>(null);
  const [backendErrors, setBackendErrors] = useState<BackendValidationErrors>({});

  // Lazy search for LinkPicker and document modals
  const [triggerCompanies] = useLazySearchCompaniesQuery();
  const [triggerContacts] = useLazySearchContactsQuery();

  const searchCompanies = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) return [];
    try {
      const res: any = await triggerCompanies(q).unwrap();
      return Array.isArray(res) ? res.map((x: any) => ({ id: x.id, name: x.name })) : [];
    } catch {
      return [];
    }
  }, [triggerCompanies]);

  const searchContacts = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) return [];
    try {
      const res: any = await triggerContacts(q).unwrap();
      return Array.isArray(res) ? res.map((x: any) => ({ id: x.id, name: x.name })) : [];
    } catch {
      return [];
    }
  }, [triggerContacts]);

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadLinks, setUploadLinks] = useState<Array<{ type:'company'|'contact'; id:number; name:string; role?:string }>>([]);

  const openUpload = () => {
    if (!contact) return;
    setUploadLinks([{ type: 'contact', id: contact.id, name: contact.name }]);
    setUploadOpen(true);
  };

  const onUploaded = async () => {
    toast.success('Document téléversé.');
    setUploadOpen(false);
    await refetchContact(); // Reload relations
  };

  // Document details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsDoc, setDetailsDoc] = useState<any | null>(null);

  const openDocDetails = async (docId: number) => {
    try {
      const resp = await fetch(`/api/documents/${docId}`, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (resp.ok) {
        const full = await resp.json();
        setDetailsDoc(full.data || full);
      } else {
        setDetailsDoc({ id: docId });
      }
    } catch {
      setDetailsDoc({ id: docId });
    }
    setDetailsOpen(true);
  };

  // Confirmation before detaching document
  const [isDocDeleteDialogOpen, setIsDocDeleteDialogOpen] = useState(false);
  const [docToDetach, setDocToDetach] = useState<any | null>(null);

  const askDetachDocument = (doc: any) => {
    setDocToDetach(doc);
    setIsDocDeleteDialogOpen(true);
  };

  const confirmDetachDocument = async () => {
    if (!docToDetach) return;
    try {
      await unlinkDocumentFromContact({ id: docToDetach.id, contactId: id }).unwrap();
      toast.success('Document détaché.');
      await refetchContact();
    } catch {
      toast.error('Échec du détachement du document.');
    } finally {
      setIsDocDeleteDialogOpen(false);
      setDocToDetach(null);
    }
  };

  // Link company (if none linked)
  const doAttachCompany = async (companyId: number) => {
    try {
      await attachCompanyContact({ companyId, contactId: id }).unwrap();
      toast.success('Entreprise liée.');
      await refetchContact();
    } catch (err: any) {
      const apiErrors: any = err?.data?.errors;
      if (apiErrors) {
        const firstKey = Object.keys(apiErrors)[0];
        toast.error(apiErrors[firstKey] ?? "Échec de l'association.");
      } else {
        toast.error("Échec de l'association.");
      }
    }
  };

  // Confirmation before detaching company
  const [isCompanyDetachDialogOpen, setIsCompanyDetachDialogOpen] = useState(false);

  const askDetachCompany = () => {
    setIsCompanyDetachDialogOpen(true);
  };

  const confirmDetachCompany = async () => {
    if (!linkedCompany) return;
    try {
      await detachCompanyContact({ companyId: linkedCompany.id, contactId: id }).unwrap();
      toast.success('Entreprise détachée.');
      await refetchContact();
    } catch {
      toast.error('Échec du détachement.');
    } finally {
      setIsCompanyDetachDialogOpen(false);
    }
  };

  // Function to open edit modal
  const handleEditContact = () => {
    if (contact) {
      setContactToEdit(contact);
      setBackendErrors({});
      setIsEditModalOpen(true);
    }
  };

  // Helper to normalize data before sending (copied from Index.tsx)
  const normalizeContactPayload = (values: any) => {
    const toNumericOrNull = (v: any) => {
      if (v === '' || v === undefined || v === null) return null;
      const num = parseFloat(v);
      return isNaN(num) ? null : num;
    };

    return {
      ...values,
      latitude: toNumericOrNull(values.latitude),
      longitude: toNumericOrNull(values.longitude),
    };
  };

  // Edit form submission
  const handleFormSubmit = async (values: any) => {
    setBackendErrors({});
    try {
      // Normalize data before sending
      const payload = normalizeContactPayload(values);

      await updateContact({ id: id, ...payload }).unwrap();
      toast.success('Contact mis à jour avec succès.');
      setIsEditModalOpen(false);
      setContactToEdit(null);
      await refetchContact(); // Reload data
    } catch (err: any) {
      if (err?.status === 422 && err?.data?.errors) {
        setBackendErrors(err.data.errors);
        toast.error('Veuillez corriger les erreurs dans le formulaire.');
      } else {
        toast.error("Échec de la mise à jour du contact. Une erreur inattendue est survenue.");
      }
    }
  };

  // Contact deletion
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const askDeleteContact = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteContact = async () => {
    try {
      await deleteContact(id as any).unwrap();
      toast.success('Contact supprimé.');
      window.location.href = '/contacts';
    } catch {
      toast.error('Échec de la suppression.');
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Contact</h2>}>
      <Head title="Contact" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="text-2xl font-semibold text-gray-900">
                {isLoadingContact ? (
                  <span className="inline-flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement…
                  </span>
                ) : (contact?.name ?? '—')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-800">
                <div className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-600" />
                  {contact?.email ? (
                    <a className="text-blue-600 hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a>
                  ) : '—'}
                </div>
                <div className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-600" />
                  {contact?.phone ? (
                    <a className="text-blue-600 hover:underline" href={`tel:${contact.phone}`}>{contact.phone}</a>
                  ) : '—'}
                </div>
                <div className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  {contact?.address ? (
                    contact.latitude && contact.longitude ? (
                      <a
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://www.google.com/maps/search/?api=1&query=${contact.latitude},${contact.longitude}`}
                      >
                        {contact.address}
                      </a>
                    ) : contact.address
                  ) : '—'}
                </div>
              </div>
            </div>

            {/* Header with back button and dropdown menu */}
            <div className="flex gap-2 items-center">
              <Link href="/contacts">
                <Button variant="outline" className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              </Link>

              {/* Dropdown menu with three dots */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 w-10 p-0" title="Options">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleEditContact} className="gap-2">
                    <Edit className="h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={askDeleteContact} className="gap-2 text-red-600">
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Linked company (single) */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Entreprise liée
              </div>
            </div>

            {linkedCompany ? (
              <div className="flex items-center justify-between rounded-md border bg-white p-4">
                <div className="text-sm text-gray-900 font-medium">{linkedCompany.name}</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={askDetachCompany}
                    disabled={isDetaching}
                    title="Détacher l'entreprise"
                  >
                    <Trash2 className="h-4 w-4" /> Détacher
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-gray-500">
                  Aucune entreprise liée. Recherchez et liez une entreprise ci-dessous.
                </div>
                <div className="max-w-md">
                  {/* Picker for companies only; no contacts */}
                  <LinkPicker
                    value={[]}
                    onChange={async (vals) => {
                      // Take the first valid selection and attach it
                      const comp = (vals as any[]).find(v => (v as any).type === 'company');
                      if (comp?.id && !isAttaching) {
                        await doAttachCompany(comp.id);
                      }
                    }}
                    searchCompanies={searchCompanies}
                    searchContacts={async () => []}
                    disableContactSearch={true} // Disable contacts
                    minChars={2}
                    debounceMs={300}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked documents */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Documents liés</div>
              <Button className="gap-2" onClick={openUpload}>
                <UploadCloud className="h-4 w-4" /> Téléverser
              </Button>
            </div>

            {isLoadingContact ? (
              <div className="text-gray-500 inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des documents…
              </div>
            ) : documents.length === 0 ? (
              <div className="text-sm text-gray-500">Aucun document lié à ce contact.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="px-3 py-2">Nom</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Taille</th>
                      <th className="px-3 py-2">Créé le</th>
                      <th className="px-3 py-2 w-[160px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d: any) => (
                      <tr key={d.id} className="border-t hover:bg-gray-50/60 transition-colors">
                        <td className="px-3 py-2 font-medium text-gray-900">{d.name}</td>
                        <td className="px-3 py-2 text-gray-700">{d.extension?.toUpperCase() || d.mime_type}</td>
                        <td className="px-3 py-2 text-gray-700">{d.size_bytes ? `${(d.size_bytes/1024).toFixed(1)} KB` : '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-80 hover:opacity-100"
                              title="Détails"
                              onClick={() => openDocDetails(d.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 opacity-80 hover:opacity-100"
                              title="Détacher"
                              onClick={() => askDetachDocument(d)}
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

        {/* Contact edit modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent
            className="sm:max-w-[600px] p-0"
            style={{ overflow: 'hidden' }}
          >
            <div
              className="flex flex-col"
              style={{ maxHeight: 'calc(100vh - 6rem)', minHeight: 300 }}
            >
              <div className="px-6 py-4">
                <DialogHeader className="p-0">
                  <DialogTitle>Modifier le contact</DialogTitle>
                  <DialogDescription>
                    Modifiez les informations du contact.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div
                className="px-6 pb-4"
                style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
              >
                <ContactForm
                  initialData={contactToEdit}
                  onSubmit={handleFormSubmit}
                  isLoading={isUpdating}
                  errors={backendErrors}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upload modal with forced links */}
        <UploadModal
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploaded={onUploaded}
          searchCompanies={searchCompanies}
          searchContacts={searchContacts}
          initialLinks={uploadLinks}
          onLinksChange={setUploadLinks}
          upload={async (form: FormData) => {
            // Force adding current contact
            if (contact) {
              const links = [{
                type: 'contact' as const,
                id: contact.id,
                name: contact.name,
                role: null
              }];
              form.append('links', JSON.stringify(links));
            }

            return await uploadDocument(form).unwrap();
          }}
        />

        {/* Document details modal */}
        <DocumentDetailsModal
          open={detailsOpen && !!detailsDoc}
          onOpenChange={(o) => setDetailsOpen(o)}
          document={detailsDoc}
          onAfterChange={async () => {
            await refetchContact();
          }}
          searchCompanies={searchCompanies}
          searchContacts={searchContacts}
        />

        {/* Document detach confirmation */}
        <AlertDialog open={isDocDeleteDialogOpen} onOpenChange={setIsDocDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Détacher le document</AlertDialogTitle>
              <AlertDialogDescription>
                {docToDetach
                  ? `Voulez-vous vraiment détacher le document "${docToDetach.name}" de ce contact ? Cette action est réversible.`
                  : 'Voulez-vous vraiment détacher ce document du contact ?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDetachDocument} className="bg-red-600 hover:bg-red-700">
                Détacher
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Company detach confirmation */}
        <AlertDialog open={isCompanyDetachDialogOpen} onOpenChange={setIsCompanyDetachDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Détacher l'entreprise</AlertDialogTitle>
              <AlertDialogDescription>
                {linkedCompany
                  ? `Voulez-vous vraiment détacher l'entreprise "${linkedCompany.name}" de ce contact ? Cette action est réversible.`
                  : 'Voulez-vous vraiment détacher cette entreprise du contact ?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDetachCompany} className="bg-red-600 hover:bg-red-700">
                Détacher
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Contact deletion confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer le contact "{contact?.name}" ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteContact} className="bg-red-600 hover:bg-red-700">
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthenticatedLayout>
  );
}
