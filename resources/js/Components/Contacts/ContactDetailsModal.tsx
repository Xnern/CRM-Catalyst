import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { UploadModal } from '@/Components/Documents/UploadModal';
import { DocumentDetailsModal } from '@/Components/Documents/DocumentDetailsModal';
import { LinkPicker } from '@/Components/Documents/LinkPicker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Phone, Mail, MapPin, Building2 } from 'lucide-react';

type Company = { id: number; name: string };
type ContactModel = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string | null;
  company_id?: number | null;
  company?: { id: number; name: string } | null;
  documents?: {
    id: number;
    name: string;
    extension?: string | null;
    mime_type?: string;
    size_bytes?: number;
    created_at?: string;
  }[];
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: number | null;
  // Data loaders
  fetchContact: (id: number) => Promise<ContactModel | null>;
  // Company/document link mutations
  linkCompany: (contactId: number, companyId: number) => Promise<void>;
  unlinkCompany: (contactId: number, companyId: number) => Promise<void>;
  unlinkDocument: (docId: number, contactId: number) => Promise<void>;
  // Document details
  fetchDocument: (id: number) => Promise<any>;
  // Search providers
  searchCompanies: (q: string) => Promise<Company[]>;
  searchContacts: (q: string) => Promise<Array<{ id: number; name: string }>>;
  // Upload
  uploadDocument: (form: FormData) => Promise<any>;
  // Contact-level actions
  onEdit?: (contactId: number) => void;
  onDelete?: (contactId: number) => void;
  onAfterChange?: () => void;
};

export const ContactDetailsModal: React.FC<Props> = ({
  open,
  onOpenChange,
  contactId,
  fetchContact,
  linkCompany,
  unlinkCompany,
  unlinkDocument,
  fetchDocument,
  searchCompanies,
  searchContacts,
  uploadDocument,
  onEdit,
  onDelete,
  onAfterChange,
}) => {
  const [contact, setContact] = useState<ContactModel | null>(null);
  const [loading, setLoading] = useState(false);

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadLinks, setUploadLinks] = useState<Array<{ type:'company'|'contact'; id:number; name:string; role?:string }>>([]);

  // Document details
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsDoc, setDetailsDoc] = useState<any | null>(null);

  // States for confirmation modals
  const [isCompanyDeleteDialogOpen, setIsCompanyDeleteDialogOpen] = useState(false);
  const [isDocumentDeleteDialogOpen, setIsDocumentDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: number; name: string } | null>(null);

  const load = async (id: number) => {
    setLoading(true);
    try {
      const c = await fetchContact(id);
      setContact(c);
    } catch {
      toast.error('Impossible de charger le contact.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && contactId) load(contactId);
  }, [open, contactId]);

  const openUpload = () => {
    if (!contact) return;
    setUploadLinks([{ type: 'contact', id: contact.id, name: contact.name }]);
    setUploadOpen(true);
  };

  const onUploaded = async () => {
    toast.success('Document téléversé.');
    setUploadOpen(false);
    if (contactId) await load(contactId);
    onAfterChange?.();
  };

  const openDocDetails = async (docId: number) => {
    try {
      const full = await fetchDocument(docId);
      setDetailsDoc(full || { id: docId });
      setDetailsOpen(true);
    } catch {
      setDetailsDoc({ id: docId });
      setDetailsOpen(true);
    }
  };

  // Handle single company attachment
  const doAttachCompany = async (item: { id: number; name: string; role?: string }) => {
    if (!contactId) return;
    try {
      await linkCompany(contactId, item.id);
      toast.success('Entreprise liée.');
      await load(contactId);
      onAfterChange?.();
    } catch {
      toast.error("Échec de l'association.");
    }
  };

  // Detach company with confirmation
  const askDetachCompany = () => {
    setIsCompanyDeleteDialogOpen(true);
  };

  const confirmDetachCompany = async () => {
    if (!contactId || !contact?.company) return;
    try {
      await unlinkCompany(contactId, contact.company.id);
      toast.success('Entreprise détachée.');
      await load(contactId);
      onAfterChange?.();
    } catch {
      toast.error('Échec du détachement.');
    } finally {
      setIsCompanyDeleteDialogOpen(false);
    }
  };

  // Detach document with confirmation
  const askDetachDocument = (doc: { id: number; name: string }) => {
    setDocumentToDelete(doc);
    setIsDocumentDeleteDialogOpen(true);
  };

  const confirmDetachDocument = async () => {
    if (!contactId || !documentToDelete) return;
    try {
      await unlinkDocument(documentToDelete.id, contactId);
      toast.success('Document détaché.');
      await load(contactId);
      onAfterChange?.();
    } catch {
      toast.error('Échec du détachement du document.');
    } finally {
      setIsDocumentDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  return (
    <Dialog open={open && !!contactId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[980px] p-0 [&>button[type='button']]:z-30" style={{ overflow: 'hidden' }}>
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
          {/* Header */}
          <div className="px-6 py-4">
            <DialogHeader className="p-0">
              <DialogTitle>Détails du contact</DialogTitle>
              <DialogDescription>Informations, entreprise et documents liés</DialogDescription>
            </DialogHeader>
          </div>

          {/* Main content with scroll */}
          <div className="px-6 pb-4" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
            {!contact || loading ? (
              <div className="text-gray-500">Chargement…</div>
            ) : (
              <div className="space-y-6">
                {/* Header info */}
                <div className="rounded-md border bg-white p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Nom</div>
                      <div className="text-gray-900 font-medium">{contact.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Email</div>
                      <div className="text-gray-900 inline-flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-600" />
                        {contact.email ? <a className="text-blue-600 hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a> : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Téléphone</div>
                      <div className="text-gray-900 inline-flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-600" />
                        {contact.phone ? <a className="text-blue-600 hover:underline" href={`tel:${contact.phone}`}>{contact.phone}</a> : '—'}
                      </div>
                    </div>
                    <div className="lg:col-span-1 md:col-span-2">
                      <div className="text-xs text-gray-500">Adresse</div>
                      <div className="text-gray-900 inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-600" />
                        {contact.address
                          ? (contact.latitude && contact.longitude
                              ? <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${contact.latitude},${contact.longitude}`}>{contact.address}</a>
                              : contact.address)
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linked company (single) */}
                <div className="rounded-md border bg-white p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-gray-900">Entreprise liée</div>
                  </div>

                  {contact.company ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-gray-600" />
                        <span className="font-medium text-gray-900">{contact.company.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={askDetachCompany}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-500">Aucune entreprise liée</div>
                      {/* LinkPicker restricted to companies only */}
                      <LinkPicker
                        value={[]}
                        onChange={async (vals) => {
                          for (const v of vals) {
                            if ((v as any).type === 'company') {
                              await doAttachCompany({ id: (v as any).id, name: (v as any).name });
                            }
                          }
                        }}
                        searchCompanies={searchCompanies}
                        searchContacts={async () => []} // No contacts in this picker
                        disableContactSearch={true}
                        minChars={2}
                        debounceMs={300}
                      />
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div className="rounded-md border bg-white p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-gray-900">Documents liés</div>
                    <Button variant="outline" size="sm" onClick={openUpload}>
                      Ajouter un document
                    </Button>
                  </div>

                  {contact.documents && contact.documents.length > 0 ? (
                    <div className="space-y-2">
                      {contact.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{doc.name}</div>
                              <div className="text-xs text-gray-500">
                                {doc.extension?.toUpperCase()} • {doc.size_bytes ? `${(doc.size_bytes / 1024).toFixed(1)} KB` : '—'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDocDetails(doc.id)}
                            >
                              Voir
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => askDetachDocument({ id: doc.id, name: doc.name })}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Aucun document lié</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer with action buttons */}
          <div className="px-6 py-3 border-t bg-gray-50/50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {contact?.name && `Contact: ${contact.name}`}
            </div>

            <div className="flex items-center gap-2">
              {onEdit && contact?.id && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => onEdit(contact.id)}
                >
                  <Pencil className="h-4 w-4" />
                  Modifier
                </Button>
              )}
              {onDelete && contact?.id && (
                <Button
                  variant="outline"
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(contact.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Upload modal for linking doc to contact */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={onUploaded}
        searchCompanies={searchCompanies}
        searchContacts={searchContacts}
        initialLinks={uploadLinks}
        onLinksChange={setUploadLinks}
        upload={async (form: FormData) => {
          await fetch('/sanctum/csrf-cookie', { credentials: 'include' });

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

          return await uploadDocument(form);
        }}
      />

      {/* Document details modal */}
      <DocumentDetailsModal
        open={detailsOpen && !!detailsDoc}
        onOpenChange={(o) => setDetailsOpen(o)}
        document={detailsDoc}
        onAfterChange={async () => {
          if (contactId) await load(contactId);
          onAfterChange?.();
        }}
        searchCompanies={searchCompanies}
        searchContacts={searchContacts}
      />

      {/* Company detach confirmation modal */}
      <AlertDialog open={isCompanyDeleteDialogOpen} onOpenChange={setIsCompanyDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Détacher l'entreprise</AlertDialogTitle>
            <AlertDialogDescription>
              {contact?.company
                ? `Voulez-vous vraiment détacher l'entreprise "${contact.company.name}" de ce contact ? Cette action est réversible.`
                : 'Voulez-vous vraiment détacher cette entreprise du contact ?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDetachCompany}
              className="bg-red-600 hover:bg-red-700"
            >
              Détacher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document detach confirmation modal */}
      <AlertDialog open={isDocumentDeleteDialogOpen} onOpenChange={setIsDocumentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Détacher le document</AlertDialogTitle>
            <AlertDialogDescription>
              {documentToDelete
                ? `Voulez-vous vraiment détacher le document "${documentToDelete.name}" de ce contact ? Cette action est réversible.`
                : 'Voulez-vous vraiment détacher ce document du contact ?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDetachDocument}
              className="bg-red-600 hover:bg-red-700"
            >
              Détacher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
