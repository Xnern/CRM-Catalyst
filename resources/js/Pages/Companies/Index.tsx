import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Company } from '@/types/Company';
import {
  useGetCompaniesQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
  useGetCompanyQuery,
  useGetCompanyStatusOptionsQuery,
} from '@/services/api';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import { Card, CardContent } from '@/Components/ui/card';
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
  Building2, Search, Plus, Pencil, Trash2, Eye, Loader2,
  ChevronLeft, ChevronRight, Link as LinkIcon, MoreVertical
} from 'lucide-react';
import CompanyAddressMapSplit from '@/Components/Companies/CompanyAddressMapSplit';

type Props = { auth: any };

// Badge styling for company status
const badgeClassesForStatus = (status?: string) => {
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

export default function CompaniesIndex({ auth }: Props) {
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState<string>('');
  const [tri, setTri] = useState('-created_at');

  const [isModalEditionOuverte, setIsModalEditionOuverte] = useState(false);
  const [isModalDetailsOuverte, setIsModalDetailsOuverte] = useState(false);

  const [edition, setEdition] = useState<Company | null>(null);
  const [selection, setSelection] = useState<Company | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fallback status metadata
  const fallbackCompanyStatuses = useMemo(
    () => [
      { value: 'Prospect', label: 'Prospect' },
      { value: 'Client', label: 'Client' },
      { value: 'Inactif', label: 'Inactif' },
    ],
    []
  );

  // Dynamic status metadata
  const { data: companyStatusesRes } = useGetCompanyStatusOptionsQuery?.() ?? { data: undefined as any };
  const companyStatuses: { value: string; label: string }[] = useMemo(() => {
    const remote = companyStatusesRes?.data ?? [];
    if (Array.isArray(remote) && remote.length > 0) return remote;
    return fallbackCompanyStatuses;
  }, [companyStatusesRes?.data, fallbackCompanyStatuses]);

  // Form update/store: respect Company type (no undefined)
  const [form, setForm] = useState<Company & { latitude?: number | null; longitude?: number | null }>({
    id: 0,
    name: '',
    domain: null,
    industry: null,
    size: null,
    status: 'Prospect',
    owner: null,
    address: null,
    city: null,
    zipcode: null,
    country: null,
    notes: null,
    contacts_count: 0,
    created_at: undefined,
    updated_at: undefined,
    latitude: null,
    longitude: null,
  });

  const queryParams = useMemo(
    () => ({ page, per_page: perPage, search: recherche, status: statut, sort: tri }),
    [page, perPage, recherche, statut, tri]
  );

  // Companies list
  const { data, isLoading, isFetching, refetch } = useGetCompaniesQuery(queryParams);

  // Adapt to your response format: { data: Company[], meta: {...} }
  const items: Company[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta ?? {};
  const currentPage = meta.current_page ?? page;
  const total = meta.total ?? items.length;
  const lastPage = meta.last_page ?? 1;

  // Company details: { data: Company }
  const { data: detailsApi, isFetching: isFetchingDetails } = useGetCompanyQuery(selection?.id ?? 0, { skip: !selection });
  const detailsCompany: Company | null = (detailsApi as any)?.data ?? null;

  // Mutations
  const [creerEntreprise] = useCreateCompanyMutation();
  const [mettreAJourEntreprise] = useUpdateCompanyMutation();
  const [supprimerEntreprise] = useDeleteCompanyMutation();

  const estEnChargement = isLoading || isFetching;

  const resetForm = (defaults?: Partial<Company> & { latitude?: number | null; longitude?: number | null }) => {
    setForm({
      id: defaults?.id ?? 0,
      name: defaults?.name ?? '',
      domain: defaults?.domain ?? null,
      industry: defaults?.industry ?? null,
      size: defaults?.size ?? null,
      status: (defaults?.status as Company['status']) ?? 'Prospect',
      owner: defaults?.owner ?? null,
      address: defaults?.address ?? null,
      city: defaults?.city ?? null,
      zipcode: defaults?.zipcode ?? null,
      country: defaults?.country ?? null,
      notes: defaults?.notes ?? null,
      created_at: defaults?.created_at,
      updated_at: defaults?.updated_at,
      contacts_count: defaults?.contacts_count ?? 0,
      latitude: (defaults as any)?.latitude ?? null,
      longitude: (defaults as any)?.longitude ?? null,
    });
  };

  const ouvrirCreation = () => {
    setEdition(null);
    resetForm({
      status: (companyStatuses[0]?.value as Company['status']) ?? 'Prospect',
    });
    setIsModalEditionOuverte(true);
  };

  const ouvrirEdition = (c: Company) => {
    setEdition(c);
    resetForm(c);
    setIsModalEditionOuverte(true);
  };

  const ouvrirEditionDepuisDetails = () => {
    const companyForEdit = detailsCompany ?? selection;
    if (!companyForEdit) return;
    setEdition(companyForEdit);
    resetForm(companyForEdit);
    setIsModalDetailsOuverte(false);
    setIsModalEditionOuverte(true);
  };

  // Function to open detail modal (used by Eye button)
  const ouvrirDetails = (c: Company) => {
    setSelection(c);
    setIsModalDetailsOuverte(true);
  };

  // Function to navigate to show page (used by row click)
  const navigateToShow = (c: Company) => {
    window.location.href = `/entreprises/${c.id}`;
  };

  const fermerEdition = () => setIsModalEditionOuverte(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!form.name || !form.name.trim()) return toast.error('Le nom est obligatoire.');
      if (edition) {
        await mettreAJourEntreprise({ id: edition.id, ...form }).unwrap();
        toast.success('Entreprise mise à jour.');
      } else {
        const payload = { ...form };
        delete (payload as any).id; // avoid sending id=0 for creation
        await creerEntreprise(payload as any).unwrap();
        toast.success('Entreprise créée.');
      }
      setIsModalEditionOuverte(false);
      refetch?.();
    } catch {
      toast.error("Échec de l'enregistrement.");
    }
  };

  const demanderSuppression = (c: Company) => { setDeleteTarget(c); setIsDeleteDialogOpen(true); };

  const confirmerSuppression = async () => {
    if (!deleteTarget) return;
    try {
      await supprimerEntreprise(deleteTarget.id).unwrap();
      toast.success('Entreprise supprimée.');
      if (selection?.id === deleteTarget.id) { setIsModalDetailsOuverte(false); setSelection(null); }
      refetch?.();
    } catch {
      toast.error('Échec de la suppression.');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Entreprises</h2>}>
      <Head title="Entreprises" />
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-600" />
                <div className="text-lg font-semibold">Gestion des entreprises</div>
              </div>
              <div className="flex-1" />
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
                  <Input
                    className="pl-8 w-64"
                    placeholder="Rechercher (nom, domaine, secteur)"
                    value={recherche}
                    onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
                  />
                </div>

                {/* Status filter */}
                <Select value={statut || 'tous'} onValueChange={(v) => { setStatut(v === 'tous' ? '' : v); setPage(1); }}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les statuts</SelectItem>
                    {companyStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={tri} onValueChange={(v) => { setTri(v); setPage(1); }}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Tri" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created_at">Plus récentes</SelectItem>
                    <SelectItem value="created_at">Plus anciennes</SelectItem>
                    <SelectItem value="name">Nom A→Z</SelectItem>
                    <SelectItem value="-name">Nom Z→A</SelectItem>
                    <SelectItem value="-contacts_count">Plus de contacts</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={ouvrirCreation} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nouvelle entreprise
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="px-4 py-2">Nom</th>
                    <th className="px-4 py-2">Domaine</th>
                    <th className="px-4 py-2">Secteur</th>
                    <th className="px-4 py-2">Taille</th>
                    <th className="px-4 py-2">Statut</th>
                    <th className="px-4 py-2">Contacts</th>
                    <th className="px-4 py-2 w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(isLoading || isFetching) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement...
                        </div>
                      </td>
                    </tr>
                  )}
                  {!isLoading && !isFetching && items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                        Aucune entreprise trouvée. Ajustez vos filtres ou créez une nouvelle entreprise.
                      </td>
                    </tr>
                  )}
                  {items.map((c: Company) => (
                    <tr
                      key={c.id}
                      className="border-t hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => navigateToShow(c)} // Navigation to show page
                      title="Cliquer pour voir la page complète"
                    >
                      <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-2 text-gray-700">{c.domain ?? '-'}</td>
                      <td className="px-4 py-2 text-gray-700">{c.industry ?? '-'}</td>
                      <td className="px-4 py-2 text-gray-700">{c.size ?? '-'}</td>
                      <td className="px-4 py-2">
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            badgeClassesForStatus(c.status as string),
                          ].join(' ')}
                        >
                          {c.status ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2">{c.contacts_count ?? 0}</td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {/* Eye button for quick preview (modal) */}
                          <Button
                            title="Aperçu rapide"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity"
                            onClick={() => ouvrirDetails(c)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            title="Modifier"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity"
                            onClick={() => ouvrirEdition(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                title="Plus d'actions"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => demanderSuppression(c)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
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

            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-gray-600">Résultats: {total}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isLoading || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <div className="px-2 py-1 text-sm">
                  Page {currentPage} / {lastPage}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= lastPage || isLoading || isFetching}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  className="gap-1"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Modal (accessible via Eye button) */}
        <Dialog open={!!selection && isModalDetailsOuverte} onOpenChange={setIsModalDetailsOuverte}>
          <DialogContent className="sm:max-w-[720px] p-0 [&>button[type='button']]:z-30" style={{ overflow: 'hidden' }}>
            <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
              <div className="px-6 py-4">
                <DialogHeader className="p-0">
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-gray-700" />
                    Aperçu de l'entreprise
                  </DialogTitle>
                  <DialogDescription>Informations principales et coordonnées</DialogDescription>
                </DialogHeader>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {(!selection || isFetchingDetails) ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des détails...
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border p-4 bg-white">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xl font-semibold text-gray-900">{detailsCompany?.name ?? selection.name}</div>
                          <div className="text-sm text-gray-600">
                            {detailsCompany?.domain ?? selection.domain ?? 'Domaine non renseigné'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={ouvrirEditionDepuisDetails}
                          >
                            <Pencil className="h-4 w-4" />
                            Modifier
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1"
                            onClick={() => demanderSuppression((detailsCompany ?? selection) as Company)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-500">Secteur</div>
                          <div className="text-sm">{detailsCompany?.industry ?? selection.industry ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Taille</div>
                          <div className="text-sm">{detailsCompany?.size ?? selection.size ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Statut</div>
                          <div className="text-sm">
                            <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', badgeClassesForStatus((detailsCompany?.status ?? selection.status) as string)].join(' ')}>
                              {detailsCompany?.status ?? selection.status ?? '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <div className="text-xs text-gray-500">Adresse</div>
                          <div className="text-sm">{detailsCompany?.address ?? selection.address ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Ville</div>
                          <div className="text-sm">{detailsCompany?.city ?? selection.city ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Code postal</div>
                          <div className="text-sm">{detailsCompany?.zipcode ?? selection.zipcode ?? '-'}</div>
                        </div>
                        <div className="md:col-span-3">
                          <div className="text-xs text-gray-500">Pays</div>
                          <div className="text-sm">{detailsCompany?.country ?? selection.country ?? '-'}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs text-gray-500">Notes</div>
                        <div className="text-sm whitespace-pre-wrap">
                          {detailsCompany?.notes ?? selection.notes ?? '—'}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border p-4 bg-white mt-4">
                      <div className="text-sm text-gray-700">
                        Ceci est un aperçu rapide. Pour plus de détails, ouvrez la page dédiée.
                      </div>
                      <div className="mt-2">
                        <a
                          href={`/entreprises/${(detailsCompany ?? selection)?.id ?? ''}`}
                          className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                        >
                          <LinkIcon className="h-4 w-4" />
                          Aller à la page complète
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create/Update Modal */}
        <Dialog open={isModalEditionOuverte} onOpenChange={setIsModalEditionOuverte}>
          <DialogContent
            className="sm:max-w-[640px] p-0 [&>button[type='button']]:z-30"
            style={{ overflow: 'hidden' }}
          >
            <div
              className="flex flex-col"
              style={{ maxHeight: 'calc(100vh - 6rem)', minHeight: 300 }}
            >
              <div className="px-6 py-4">
                <DialogHeader className="p-0">
                  <DialogTitle>{edition ? 'Modifier une entreprise' : 'Créer une entreprise'}</DialogTitle>
                  <DialogDescription>Saisissez les informations principales.</DialogDescription>
                </DialogHeader>
              </div>

              <div
                className="px-6 py-4"
                style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
              >
                <form id="company-edit-form" onSubmit={soumettre} className="space-y-4">
                  {/* Status + badge */}
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700">Statut</label>
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          badgeClassesForStatus(form.status),
                        ].join(' ')}
                      >
                        {form.status ?? '—'}
                      </span>
                    </div>
                    <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Company['status'] }))}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un statut" /></SelectTrigger>
                      <SelectContent>
                        {companyStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-700">Nom</label>
                      <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Domaine</label>
                      <Input value={form.domain ?? ''} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value || null }))} placeholder="ex: exemple.com" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Secteur</label>
                      <Input value={form.industry ?? ''} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value || null }))} placeholder="ex: SaaS, Retail, ..." />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Taille</label>
                      <Input value={form.size ?? ''} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value || null }))} placeholder="ex: 11-50" />
                    </div>
                  </div>

                  <CompanyAddressMapSplit
                    address={form.address ?? ''}
                    city={form.city ?? ''}
                    zipcode={form.zipcode ?? ''}
                    country={form.country ?? ''}
                    latitude={(form as any).latitude ?? null}
                    longitude={(form as any).longitude ?? null}
                    onChange={(vals) => setForm((f) => ({
                      ...f,
                      address: vals.address ?? null,
                      city: vals.city ?? null,
                      zipcode: vals.zipcode ?? null,
                      country: vals.country ?? null,
                      latitude: vals.latitude ?? null,
                      longitude: vals.longitude ?? null,
                    }))}
                    mapHeightClass="h-56"
                  />

                  <div>
                    <label className="text-sm text-gray-700">Notes</label>
                    <textarea
                      className="w-full border rounded-md p-2 text-sm"
                      rows={4}
                      value={form.notes ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                    />
                  </div>
                </form>
              </div>

              <div
                className="px-6 py-3"
                style={{ flex: '0 0 auto', background: 'white', borderTop: '1px solid rgba(0,0,0,0.06)' }}
              >
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={fermerEdition}>Annuler</Button>
                  <Button type="submit" form="company-edit-form">{edition ? 'Enregistrer' : 'Créer'}</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation modal */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `Voulez-vous vraiment supprimer l'entreprise "${deleteTarget.name}" ? Cette action est irréversible.`
                  : 'Voulez-vous vraiment supprimer cette entreprise ?'}
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
      </div>
    </AuthenticatedLayout>
  );
}
