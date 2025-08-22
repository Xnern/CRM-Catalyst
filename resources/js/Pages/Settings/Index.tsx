import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { Switch } from '@/Components/ui/switch';
import { Badge } from '@/Components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Separator } from '@/Components/ui/separator';
import {
  Settings,
  Building,
  Mail,
  TrendingUp,
  Cog,
  Palette,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle,
  Upload,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetCrmSettingsQuery,
  useUpdateCrmSettingsMutation,
  useResetCrmSettingsMutation,
  type CrmSettings
} from '@/services/api';

type Props = { auth: any };

const currencies = [
  { value: 'USD', label: 'Dollar US ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'Livre Sterling (£)' },
  { value: 'CAD', label: 'Dollar Canadien (C$)' },
  { value: 'JPY', label: 'Yen Japonais (¥)' }
];

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Heure de l\'Est' },
  { value: 'America/Chicago', label: 'Heure Centrale' },
  { value: 'America/Denver', label: 'Heure des Montagnes' },
  { value: 'America/Los_Angeles', label: 'Heure du Pacifique' },
  { value: 'Europe/London', label: 'Londres' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' }
];

const languages = [
  { value: 'en', label: 'Anglais' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Espagnol' },
  { value: 'de', label: 'Allemand' },
  { value: 'it', label: 'Italien' }
];

/**
 * CRM Settings Page Component
 * Comprehensive configuration interface for all CRM settings
 */
export default function SettingsIndex({ auth }: Props) {
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // API hooks
  const {
    data: settingsData,
    isLoading: isLoadingSettings,
    refetch
  } = useGetCrmSettingsQuery();

  const [
    updateSettings,
    { isLoading: isUpdating }
  ] = useUpdateCrmSettingsMutation();

  const [
    resetSettings,
    { isLoading: isResetting }
  ] = useResetCrmSettingsMutation();

  // Initialize settings from API
  useEffect(() => {
    if (settingsData?.data) {
      setSettings(settingsData.data);
      setHasChanges(false);
    }
  }, [settingsData]);

  // Handle setting changes
  const handleSettingChange = (category: keyof CrmSettings, key: string, value: any) => {
    if (!settings) return;

    setSettings(prev => ({
      ...prev!,
      [category]: {
        ...prev![category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  // Handle array setting changes (for lead sources, stages, etc.)
  const handleArraySettingChange = (category: keyof CrmSettings, key: string, index: number, value: string) => {
    if (!settings) return;

    const currentArray = settings[category][key] as string[];
    const newArray = [...currentArray];
    newArray[index] = value;

    handleSettingChange(category, key, newArray);
  };

  // Add item to array setting
  const addArrayItem = (category: keyof CrmSettings, key: string) => {
    if (!settings) return;

    const currentArray = settings[category][key] as string[];
    const newArray = [...currentArray, ''];

    handleSettingChange(category, key, newArray);
  };

  // Remove item from array setting
  const removeArrayItem = (category: keyof CrmSettings, key: string, index: number) => {
    if (!settings) return;

    const currentArray = settings[category][key] as string[];
    const newArray = currentArray.filter((_, i) => i !== index);

    handleSettingChange(category, key, newArray);
  };

  // Save settings
  const handleSave = async () => {
    if (!settings || !hasChanges) return;

    try {
      await updateSettings(settings).unwrap();
      toast.success('Paramètres sauvegardés avec succès !');
      setHasChanges(false);
      // Reload the page to refresh all components with new settings
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Échec de la sauvegarde. Veuillez réessayer.');
    }
  };

  // Reset settings
  const handleReset = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ?')) {
      return;
    }

    try {
      await resetSettings().unwrap();
      toast.success('Paramètres réinitialisés aux valeurs par défaut');
      refetch();
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to reset settings:', error);
      toast.error('Échec de la réinitialisation. Veuillez réessayer.');
    }
  };

  if (isLoadingSettings || !settings) {
    return (
      <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Paramètres</h2>}>
        <Head title="Paramètres" />
        <div className="p-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Chargement des paramètres...</span>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Paramètres</h2>}>
      <Head title="Paramètres" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
        <div>
            <h3 className="text-2xl font-bold">Paramètres CRM</h3>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
            <span>Configurez les préférences et comportements de votre système CRM</span>
            {hasChanges && (
                <Badge variant="secondary">
                Modifications non sauvegardées
                </Badge>
            )}
            </div>
        </div>
        <div className="flex gap-3">
            <Button
            onClick={handleReset}
            variant="outline"
            disabled={isResetting || isUpdating}
            >
            {isResetting ? (
                <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Réinitialisation...
                </>
            ) : (
                <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Réinitialiser
                </>
            )}
            </Button>
            <Button
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
            className="bg-primary-600 hover:bg-primary-700"
            >
            {isUpdating ? (
                <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sauvegarde...
                </>
            ) : (
                <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
                </>
            )}
            </Button>
        </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Général
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ventes
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              Système
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Identité
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Sécurité
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Informations de l'entreprise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nom de l'entreprise</Label>
                    <Input
                      id="company_name"
                      value={settings.general.company_name}
                      onChange={(e) => handleSettingChange('general', 'company_name', e.target.value)}
                      placeholder="Saisissez le nom de votre entreprise"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_email">Email de l'entreprise</Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={settings.general.company_email}
                      onChange={(e) => handleSettingChange('general', 'company_email', e.target.value)}
                      placeholder="entreprise@exemple.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company_phone">Numéro de téléphone</Label>
                    <Input
                      id="company_phone"
                      value={settings.general.company_phone}
                      onChange={(e) => handleSettingChange('general', 'company_phone', e.target.value)}
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default_currency">Devise par défaut</Label>
                    <Select
                      value={settings.general.default_currency}
                      onValueChange={(value) => handleSettingChange('general', 'default_currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(currency => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_address">Adresse</Label>
                  <Textarea
                    id="company_address"
                    value={settings.general.company_address}
                    onChange={(e) => handleSettingChange('general', 'company_address', e.target.value)}
                    placeholder="Saisissez l'adresse de votre entreprise"
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuseau horaire</Label>
                    <Select
                      value={settings.general.timezone}
                      onValueChange={(value) => handleSettingChange('general', 'timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map(timezone => (
                          <SelectItem key={timezone.value} value={timezone.value}>
                            {timezone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Langue par défaut</Label>
                    <Select
                      value={settings.general.language}
                      onValueChange={(value) => handleSettingChange('general', 'language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map(language => (
                          <SelectItem key={language.value} value={language.value}>
                            {language.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Configuration SMTP
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_host">Serveur SMTP</Label>
                      <Input
                        id="smtp_host"
                        value={settings.email.smtp_host}
                        onChange={(e) => handleSettingChange('email', 'smtp_host', e.target.value)}
                        placeholder="smtp.gmail.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp_port">Port SMTP</Label>
                      <Input
                        id="smtp_port"
                        type="number"
                        value={settings.email.smtp_port}
                        onChange={(e) => handleSettingChange('email', 'smtp_port', e.target.value)}
                        placeholder="587"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_username">Nom d'utilisateur</Label>
                      <Input
                        id="smtp_username"
                        value={settings.email.smtp_username}
                        onChange={(e) => handleSettingChange('email', 'smtp_username', e.target.value)}
                        placeholder="votre-email@gmail.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp_password">Mot de passe</Label>
                      <Input
                        id="smtp_password"
                        type="password"
                        value={settings.email.smtp_password}
                        onChange={(e) => handleSettingChange('email', 'smtp_password', e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_encryption">Chiffrement</Label>
                      <Select
                        value={settings.email.smtp_encryption || 'tls'}
                        onValueChange={(value) => handleSettingChange('email', 'smtp_encryption', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                          <SelectItem value="none">Aucun</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Configuration Mailtrap</Label>
                      <div className="text-sm text-gray-500">
                        Pour utiliser Mailtrap, utilisez : <br />
                        Host: sandbox.smtp.mailtrap.io <br />
                        Port: 2525, 465 ou 587 <br />
                        Chiffrement: TLS
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Informations de l'expéditeur par défaut</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email_from_name">Nom de l'expéditeur</Label>
                      <Input
                        id="email_from_name"
                        value={settings.email.email_from_name}
                        onChange={(e) => handleSettingChange('email', 'email_from_name', e.target.value)}
                        placeholder="Nom de votre entreprise"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email_from_address">Adresse email de l'expéditeur</Label>
                      <Input
                        id="email_from_address"
                        type="email"
                        value={settings.email.email_from_address}
                        onChange={(e) => handleSettingChange('email', 'email_from_address', e.target.value)}
                        placeholder="noreply@votreentreprise.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sales Settings */}
          <TabsContent value="sales">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Configuration du processus de vente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="default_pipeline">Pipeline par défaut</Label>
                    <Input
                      id="default_pipeline"
                      value={settings.sales.default_pipeline}
                      onChange={(e) => handleSettingChange('sales', 'default_pipeline', e.target.value)}
                      placeholder="Pipeline de vente standard"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Sources de prospects</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addArrayItem('sales', 'lead_sources')}
                      >
                        Ajouter une source
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {settings.sales.lead_sources.map((source, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={source}
                            onChange={(e) => handleArraySettingChange('sales', 'lead_sources', index, e.target.value)}
                            placeholder="Saisissez une source de prospect"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeArrayItem('sales', 'lead_sources', index)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Étapes d'opportunité</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addArrayItem('sales', 'opportunity_stages')}
                      >
                        Ajouter une étape
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {settings.sales.opportunity_stages.map((stage, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={stage}
                            onChange={(e) => handleArraySettingChange('sales', 'opportunity_stages', index, e.target.value)}
                            placeholder="Saisissez le nom de l'étape"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeArrayItem('sales', 'opportunity_stages', index)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  Configuration système
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="data_retention_days">Rétention des données (Jours)</Label>
                    <Input
                      id="data_retention_days"
                      type="number"
                      value={settings.system.data_retention_days}
                      onChange={(e) => handleSettingChange('system', 'data_retention_days', e.target.value)}
                      placeholder="365"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Settings */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Identité visuelle & Apparence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="company_logo_url">URL du logo de l'entreprise</Label>
                  <Input
                    id="company_logo_url"
                    value={settings.branding.company_logo_url}
                    onChange={(e) => handleSettingChange('branding', 'company_logo_url', e.target.value)}
                    placeholder="https://exemple.com/logo.png"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Couleur principale</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary_color"
                        value={settings.branding.primary_color}
                        onChange={(e) => handleSettingChange('branding', 'primary_color', e.target.value)}
                        placeholder="#3b82f6"
                      />
                      <input
                        type="color"
                        value={settings.branding.primary_color}
                        onChange={(e) => handleSettingChange('branding', 'primary_color', e.target.value)}
                        className="w-12 h-10 rounded border border-gray-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Couleur secondaire</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary_color"
                        value={settings.branding.secondary_color}
                        onChange={(e) => handleSettingChange('branding', 'secondary_color', e.target.value)}
                        placeholder="#64748b"
                      />
                      <input
                        type="color"
                        value={settings.branding.secondary_color}
                        onChange={(e) => handleSettingChange('branding', 'secondary_color', e.target.value)}
                        className="w-12 h-12 rounded border border-gray-300"
                      />
                    </div>
                  </div>
                </div>

                {settings.branding.company_logo_url && (
                  <div className="space-y-2">
                    <Label>Aperçu du logo</Label>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <img
                        src={settings.branding.company_logo_url}
                        alt="Logo de l'entreprise"
                        className="max-h-20 max-w-40 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Settings */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Configuration des uploads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="upload_max_file_size">Taille max fichier (Mo)</Label>
                    <Input
                      id="upload_max_file_size"
                      type="number"
                      value={settings.upload?.upload_max_file_size || ''}
                      onChange={(e) => handleSettingChange('upload', 'upload_max_file_size', e.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upload_storage_path">Chemin de stockage</Label>
                    <Input
                      id="upload_storage_path"
                      value={settings.upload?.upload_storage_path || ''}
                      onChange={(e) => handleSettingChange('upload', 'upload_storage_path', e.target.value)}
                      placeholder="documents"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Extensions de fichiers autorisées</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayItem('upload', 'upload_allowed_extensions')}
                    >
                      Ajouter une extension
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(settings.upload?.upload_allowed_extensions || []).map((ext: string, index: number) => (
                      <div key={index} className="flex gap-1">
                        <Input
                          value={ext}
                          onChange={(e) => handleArraySettingChange('upload', 'upload_allowed_extensions', index, e.target.value)}
                          placeholder="pdf"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeArrayItem('upload', 'upload_allowed_extensions', index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configuration de sécurité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="session_lifetime">Durée de session (minutes)</Label>
                    <Input
                      id="session_lifetime"
                      type="number"
                      value={settings.security?.session_lifetime || ''}
                      onChange={(e) => handleSettingChange('security', 'session_lifetime', e.target.value)}
                      placeholder="120"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password_min_length">Longueur min. mot de passe</Label>
                    <Input
                      id="password_min_length"
                      type="number"
                      value={settings.security?.password_min_length || ''}
                      onChange={(e) => handleSettingChange('security', 'password_min_length', e.target.value)}
                      placeholder="8"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Exigences de mot de passe</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password_require_uppercase">Exiger des majuscules</Label>
                      <Switch
                        id="password_require_uppercase"
                        checked={settings.security?.password_require_uppercase || false}
                        onCheckedChange={(checked) => handleSettingChange('security', 'password_require_uppercase', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password_require_lowercase">Exiger des minuscules</Label>
                      <Switch
                        id="password_require_lowercase"
                        checked={settings.security?.password_require_lowercase || false}
                        onCheckedChange={(checked) => handleSettingChange('security', 'password_require_lowercase', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password_require_numbers">Exiger des chiffres</Label>
                      <Switch
                        id="password_require_numbers"
                        checked={settings.security?.password_require_numbers || false}
                        onCheckedChange={(checked) => handleSettingChange('security', 'password_require_numbers', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password_require_special_chars">Exiger des caractères spéciaux</Label>
                      <Switch
                        id="password_require_special_chars"
                        checked={settings.security?.password_require_special_chars || false}
                        onCheckedChange={(checked) => handleSettingChange('security', 'password_require_special_chars', checked)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="two_factor_enabled">Authentification à deux facteurs</Label>
                    <p className="text-sm text-gray-500">Activer 2FA pour tous les utilisateurs</p>
                  </div>
                  <Switch
                    id="two_factor_enabled"
                    checked={settings.security?.two_factor_enabled || false}
                    onCheckedChange={(checked) => handleSettingChange('security', 'two_factor_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
