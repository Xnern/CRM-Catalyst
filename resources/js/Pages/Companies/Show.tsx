import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useGetCompanyQuery, useDeleteCompanyMutation, useUpdateCompanyMutation } from '@/services/api';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/Components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/Components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Building2, ArrowLeft, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import CompanyAddressMapSplit, { SplitAddress } from '@/Components/Companies/CompanyAddressMapSplit';
import { Company } from '@/types/Company';

type Props = { auth: any; id: number };
const STATUTS: Company['status'][] = ['Prospect', 'Client', 'Inactif'];

export default function CompanyShow({ auth, id }: Props) {
  const { data, isLoading } = useGetCompanyQuery(id);
  const [deleteCompany] = useDeleteCompanyMutation();
  const [updateCompany] = useUpdateCompanyMutation();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [form, setForm] = useState<Partial<Company> & SplitAddress>({
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

  useMemo(() => {
    if (data) {
      setForm({
        id: data.id,
        name: data.name,
        domain: data.domain ?? '',
        industry: data.industry ?? '',
        size: data.size ?? '',
        status: data.status,
        owner_id: data.owner_id,
        address: data.address ?? '',
        city: data.city ?? '',
        zipcode: data.zipcode ?? '',
        country: data.country ?? '',
        notes: data.notes ?? '',
        latitude: (data as any).latitude ?? null,
        longitude: (data as any).longitude ?? null
      });
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
    try {
      if (!form.name || !form.name.trim()) {
        toast.error('Le nom est obligatoire.');
        return;
      }
      await updateCompany({ id, ...form }).unwrap();
      toast.success('Entreprise mise à jour.');
      setIsEditOpen(false);
    } catch {
      toast.error('Échec de la mise à jour.');
    }
  };

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Entreprise</h2>}>
      <Head title="Entreprise" />

      <div className="p-6 space-y-6">
        {isLoading && <div className="text-gray-500">Chargement…</div>}

        {!isLoading && data && (
          <>
            {/* En-tête avec Retour et menu actions */}
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

                  {/* Menu Actions */}
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
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Secteur</div>
                  <div className="text-sm">{data.industry ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Taille</div>
                  <div className="text-sm">{data.size ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Propriétaire (ID)</div>
                  <div className="text-sm">{data.owner_id ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Contacts liés</div>
                  <div className="text-sm">{data.contacts_count ?? '-'}</div>
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

            {/* Modale Édition – un seul scroll, footer non scrollable (collé en bas) */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogContent
                className="sm:max-w-[700px] p-0 [&>button[type='button']]:z-30"
                style={{ overflow: 'hidden' }}
              >
                <div
                  className="flex flex-col"
                  style={{ maxHeight: 'calc(100vh - 6rem)', minHeight: 300 }}
                >
                  {/* Header simple (non sticky) */}
                  <div className="px-6 py-4">
                    <DialogHeader className="p-0">
                      <DialogTitle>Modifier l’entreprise</DialogTitle>
                      <DialogDescription>Mettre à jour les informations et l’adresse.</DialogDescription>
                    </DialogHeader>
                  </div>

                  {/* Zone scrollable unique */}
                  <div
                    className="px-6 py-4"
                    style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
                  >
                    <form id="company-edit-form" onSubmit={soumettreEdition} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-gray-700">Nom</label>
                          <Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                        </div>
                        <div>
                          <label className="text-sm text-gray-700">Domaine</label>
                          <Input value={form.domain ?? ''} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="ex: exemple.com" />
                        </div>
                        <div>
                          <label className="text-sm text-gray-700">Secteur</label>
                          <Input value={form.industry ?? ''} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} placeholder="ex: SaaS, Retail, ..." />
                        </div>
                        <div>
                          <label className="text-sm text-gray-700">Taille</label>
                          <Input value={form.size ?? ''} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="ex: 11-50" />
                        </div>
                        <div>
                          <label className="text-sm text-gray-700">Statut</label>
                          <Select value={(form.status as string) ?? 'Prospect'} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Company['status'] }))}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner un statut" /></SelectTrigger>
                            <SelectContent>
                              {STATUTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-gray-700">ID Propriétaire</label>
                          <Input
                            type="number"
                            value={form.owner_id ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, owner_id: e.target.value ? Number(e.target.value) : null }))}
                            placeholder="ex: 1"
                          />
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
                      </div>

                    </form>
                  </div>

                  {/* Footer non scrollable, collé en bas */}
                  <div
                    className="px-6 py-3"
                    style={{ flex: '0 0 auto', background: 'white', borderTop: '1px solid rgba(0,0,0,0.06)' }}
                  >
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

            {/* Modale confirmation suppression */}
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
