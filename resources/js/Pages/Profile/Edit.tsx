import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Badge } from '@/Components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Settings, 
  Lock,
  Save,
  Camera,
  Briefcase,
  Globe,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  job_title?: string;
  department?: string;
  timezone?: string;
  avatar?: string;
  created_at: string;
  email_verified_at?: string;
  roles?: Array<{ id: number; name: string }>;
  permissions?: Array<{ id: number; name: string }>;
}

interface Props {
  auth: {
    user: User;
  };
  mustVerifyEmail: boolean;
  status?: string;
  userRoles?: Array<{ id: number; name: string }>;
  userPermissions?: Array<{ id: number; name: string }>;
}

const translatePermission = (permission: string): string => {
  const translations: { [key: string]: string } = {
    // CRM Settings
    'view crm settings': 'Voir les paramètres CRM',
    'manage crm settings': 'Gérer les paramètres CRM',
    
    // Dashboard
    'view dashboard': 'Voir le tableau de bord',
    'view all stats': 'Voir toutes les statistiques',
    
    // Contacts
    'view contacts': 'Voir les contacts',
    'view all contacts': 'Voir tous les contacts',
    'create contacts': 'Créer des contacts',
    'edit contacts': 'Modifier les contacts',
    'delete contacts': 'Supprimer les contacts',
    'import contacts': 'Importer des contacts',
    'export contacts': 'Exporter des contacts',
    
    // Companies
    'view companies': 'Voir les entreprises',
    'view all companies': 'Voir toutes les entreprises',
    'create companies': 'Créer des entreprises',
    'edit companies': 'Modifier les entreprises',
    'delete companies': 'Supprimer les entreprises',
    
    // Opportunities
    'view opportunities': 'Voir les opportunités',
    'view all opportunities': 'Voir toutes les opportunités',
    'create opportunities': 'Créer des opportunités',
    'edit opportunities': 'Modifier les opportunités',
    'delete opportunities': 'Supprimer les opportunités',
    'change opportunity stage': 'Changer le statut des opportunités',
    
    // Documents
    'view documents': 'Voir les documents',
    'view all documents': 'Voir tous les documents',
    'upload documents': 'Télécharger des documents',
    'edit documents': 'Modifier les documents',
    'delete documents': 'Supprimer les documents',
    'download documents': 'Télécharger les documents',
    
    // Calendar
    'view calendar': 'Voir le calendrier',
    'manage calendar events': 'Gérer les événements du calendrier',
    
    // Users
    'view users': 'Voir les utilisateurs',
    'create users': 'Créer des utilisateurs',
    'edit users': 'Modifier les utilisateurs',
    'delete users': 'Supprimer les utilisateurs',
    'assign roles': 'Assigner des rôles',
    
    // Reports
    'view reports': 'Voir les rapports',
    'export reports': 'Exporter les rapports',
    'generate advanced reports': 'Générer des rapports avancés',
  };

  return translations[permission] || permission;
};

export default function Edit({ auth, mustVerifyEmail, status, userRoles, userPermissions }: Props) {
  const user = auth.user;
  const [isUploading, setIsUploading] = useState(false);

  // Form pour les informations personnelles
  const profileForm = useForm({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    address: user.address || '',
    job_title: user.job_title || '',
    department: user.department || '',
    timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Form pour le mot de passe
  const passwordForm = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileForm.patch('/profile', {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Profil mis à jour avec succès');
      },
      onError: () => {
        toast.error('Erreur lors de la mise à jour du profil');
      },
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    passwordForm.put('/password', {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Mot de passe mis à jour avec succès');
        passwordForm.reset();
      },
      onError: () => {
        toast.error('Erreur lors de la mise à jour du mot de passe');
      },
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille du fichier (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2MB');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: formData,
      });

      if (response.ok) {
        toast.success('Photo de profil mise à jour');
        window.location.reload();
      } else {
        toast.error('Erreur lors du téléchargement de l\'image');
      }
    } catch (error) {
      toast.error('Erreur lors du téléchargement de l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mon Profil</h2>
        </div>
      }
    >
      <Head title="Mon Profil" />

      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {/* En-tête du profil */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-primary-100 text-primary-700 text-2xl">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="h-4 w-4 text-gray-600" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">{user.name}</h3>
                  <p className="text-gray-600">{user.email}</p>
                  <div className="flex items-center gap-4 mt-3">
                    {user.job_title && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Briefcase className="h-4 w-4" />
                        {user.job_title}
                      </div>
                    )}
                    {user.department && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Building2 className="h-4 w-4" />
                        {user.department}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      Membre depuis {format(new Date(user.created_at), 'MMMM yyyy', { locale: fr })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {(userRoles || user.roles)?.map(role => (
                    <Badge key={role.id} variant="secondary" className="capitalize">
                      <Shield className="h-3 w-3 mr-1" />
                      {role.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onglets */}
          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">
                <User className="h-4 w-4 mr-2" />
                Informations personnelles
              </TabsTrigger>
              <TabsTrigger value="security">
                <Lock className="h-4 w-4 mr-2" />
                Sécurité
              </TabsTrigger>
              <TabsTrigger value="permissions">
                <Shield className="h-4 w-4 mr-2" />
                Rôles et permissions
              </TabsTrigger>
            </TabsList>

            {/* Informations personnelles */}
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Informations personnelles</CardTitle>
                  <CardDescription>
                    Mettez à jour vos informations personnelles et coordonnées
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom complet</Label>
                        <Input
                          id="name"
                          value={profileForm.data.name}
                          onChange={(e) => profileForm.setData('name', e.target.value)}
                          required
                        />
                        {profileForm.errors.name && (
                          <p className="text-sm text-red-600">{profileForm.errors.name}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Adresse email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.data.email}
                          onChange={(e) => profileForm.setData('email', e.target.value)}
                          required
                        />
                        {profileForm.errors.email && (
                          <p className="text-sm text-red-600">{profileForm.errors.email}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={profileForm.data.phone}
                          onChange={(e) => profileForm.setData('phone', e.target.value)}
                        />
                        {profileForm.errors.phone && (
                          <p className="text-sm text-red-600">{profileForm.errors.phone}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Adresse</Label>
                        <Input
                          id="address"
                          value={profileForm.data.address}
                          onChange={(e) => profileForm.setData('address', e.target.value)}
                        />
                        {profileForm.errors.address && (
                          <p className="text-sm text-red-600">{profileForm.errors.address}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="job_title">Poste</Label>
                        <Input
                          id="job_title"
                          value={profileForm.data.job_title}
                          onChange={(e) => profileForm.setData('job_title', e.target.value)}
                        />
                        {profileForm.errors.job_title && (
                          <p className="text-sm text-red-600">{profileForm.errors.job_title}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department">Département</Label>
                        <Input
                          id="department"
                          value={profileForm.data.department}
                          onChange={(e) => profileForm.setData('department', e.target.value)}
                        />
                        {profileForm.errors.department && (
                          <p className="text-sm text-red-600">{profileForm.errors.department}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timezone">Fuseau horaire</Label>
                        <Input
                          id="timezone"
                          value={profileForm.data.timezone}
                          onChange={(e) => profileForm.setData('timezone', e.target.value)}
                        />
                        {profileForm.errors.timezone && (
                          <p className="text-sm text-red-600">{profileForm.errors.timezone}</p>
                        )}
                      </div>
                    </div>

                    {mustVerifyEmail && user.email_verified_at === null && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          Votre adresse email n'est pas vérifiée.
                          <button
                            type="button"
                            className="ml-2 underline text-yellow-900 hover:text-yellow-700"
                          >
                            Renvoyer l'email de vérification
                          </button>
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={profileForm.processing}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer les modifications
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sécurité */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Modifier le mot de passe</CardTitle>
                  <CardDescription>
                    Assurez-vous d'utiliser un mot de passe fort et unique
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="current_password">Mot de passe actuel</Label>
                      <Input
                        id="current_password"
                        type="password"
                        value={passwordForm.data.current_password}
                        onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                        required
                      />
                      {passwordForm.errors.current_password && (
                        <p className="text-sm text-red-600">{passwordForm.errors.current_password}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Nouveau mot de passe</Label>
                      <Input
                        id="password"
                        type="password"
                        value={passwordForm.data.password}
                        onChange={(e) => passwordForm.setData('password', e.target.value)}
                        required
                      />
                      {passwordForm.errors.password && (
                        <p className="text-sm text-red-600">{passwordForm.errors.password}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password_confirmation">Confirmer le nouveau mot de passe</Label>
                      <Input
                        id="password_confirmation"
                        type="password"
                        value={passwordForm.data.password_confirmation}
                        onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                        required
                      />
                      {passwordForm.errors.password_confirmation && (
                        <p className="text-sm text-red-600">{passwordForm.errors.password_confirmation}</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={passwordForm.processing}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Mettre à jour le mot de passe
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rôles et permissions */}
            <TabsContent value="permissions">
              <Card>
                <CardHeader>
                  <CardTitle>Rôles et permissions</CardTitle>
                  <CardDescription>
                    Vos rôles et permissions dans l'application
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Rôles */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Rôles assignés</h4>
                      <div className="flex flex-wrap gap-2">
                        {(userRoles || user.roles) && (userRoles || user.roles).length > 0 ? (
                          (userRoles || user.roles).map(role => (
                            <Badge key={role.id} variant="default" className="capitalize">
                              {role.name}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Aucun rôle assigné</p>
                        )}
                      </div>
                    </div>

                    {/* Permissions */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Permissions</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {(userPermissions || user.permissions) && (userPermissions || user.permissions).length > 0 ? (
                          (userPermissions || user.permissions).map(permission => (
                            <div key={permission.id} className="flex items-center gap-2 text-sm">
                              <div className="h-2 w-2 bg-green-500 rounded-full" />
                              <span className="text-gray-600">{translatePermission(permission.name)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 col-span-full">
                            Les permissions sont héritées de vos rôles
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}