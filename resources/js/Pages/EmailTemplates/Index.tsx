import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { 
  Mail, Plus, Copy, Trash2, Edit, Eye, Send, 
  Star, Users, Hash, FileText, CheckCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/Components/ui/dialog';
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

interface EmailTemplate {
  id: number;
  name: string;
  category: string;
  subject: string;
  body: string;
  variables?: string[];
  is_active: boolean;
  is_shared: boolean;
  usage_count: number;
  user?: {
    id: number;
    name: string;
  };
}

interface Props {
  templates: Record<string, EmailTemplate[]>;
  categories: Record<string, string>;
  variables: Record<string, string>;
  auth: any;
}

export default function EmailTemplatesIndex({ templates, categories, variables, auth }: Props) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    subject: '',
    body: '',
    is_shared: false,
  });

  const [previewData, setPreviewData] = useState({
    subject: '',
    body: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = selectedTemplate 
      ? `/modeles-email/${selectedTemplate.id}`
      : '/modeles-email';
    
    const method = selectedTemplate ? 'put' : 'post';
    
    router[method](url, formData, {
      onSuccess: () => {
        toast.success(selectedTemplate ? 'Template mis à jour' : 'Template créé avec succès');
        setShowCreateDialog(false);
        setShowEditDialog(false);
        resetForm();
        setSelectedTemplate(null);
      },
      onError: () => {
        toast.error(selectedTemplate ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création du template');
      }
    });
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      subject: template.subject,
      body: template.body,
      is_shared: template.is_shared,
    });
    setShowEditDialog(true);
  };

  const handleDuplicate = (template: EmailTemplate) => {
    router.post(`/modeles-email/${template.id}/duplicate`, {}, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Template dupliqué avec succès');
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTemplateId) return;
    
    router.delete(`/modeles-email/${deleteTemplateId}`, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Template supprimé');
        setDeleteTemplateId(null);
      },
      onError: () => {
        toast.error('Erreur lors de la suppression');
      }
    });
  };

  const handlePreview = async (template: EmailTemplate) => {
    setSelectedTemplate(template);
    
    try {
      const response = await fetch(`/api/modeles-email/${template.id}/preview`);
      if (response.ok) {
        const data = await response.json();
        setPreviewData({
          subject: data.subject,
          body: data.body,
        });
        setShowPreviewDialog(true);
      }
    } catch (error) {
      toast.error('Erreur lors du preview');
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-body') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.body;
      const newText = text.substring(0, start) + variable + text.substring(end);
      setFormData({ ...formData, body: newText });
      
      // Repositionner le curseur après la variable
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 0);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'general',
      subject: '',
      body: '',
      is_shared: false,
    });
    setSelectedTemplate(null);
  };

  // Filtrer les templates
  const getAllTemplates = () => {
    const allTemplates: EmailTemplate[] = [];
    Object.values(templates).forEach(categoryTemplates => {
      allTemplates.push(...categoryTemplates);
    });
    return allTemplates;
  };

  const filteredTemplates = getAllTemplates().filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'personal' && template.user?.id === auth.user.id) ||
                      (activeTab === 'shared' && template.is_shared);
    return matchesSearch && matchesTab;
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'bg-gray-100 text-gray-800',
      welcome: 'bg-green-100 text-green-800',
      follow_up: 'bg-blue-100 text-blue-800',
      proposal: 'bg-purple-100 text-purple-800',
      negotiation: 'bg-orange-100 text-orange-800',
      closing: 'bg-red-100 text-red-800',
      thank_you: 'bg-pink-100 text-pink-800',
      meeting: 'bg-indigo-100 text-indigo-800',
      information: 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Templates d'Emails</h2>}>
      <Head title="Templates d'Emails" />
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header avec stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getAllTemplates().length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Mes Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getAllTemplates().filter(t => t.user?.id === auth.user.id).length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Templates Partagés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getAllTemplates().filter(t => t.is_shared).length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Utilisations Totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getAllTemplates().reduce((sum, t) => sum + t.usage_count, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions et filtres */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Rechercher un template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">Tous</TabsTrigger>
                  <TabsTrigger value="personal">Personnel</TabsTrigger>
                  <TabsTrigger value="shared">Partagés</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Créer un nouveau template</DialogTitle>
                    <DialogDescription>
                      Créez un template d'email réutilisable avec des variables dynamiques
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nom du template</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: Email de bienvenue"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="category">Catégorie</Label>
                        <Select 
                          value={formData.category} 
                          onValueChange={(value) => setFormData({...formData, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(categories).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-end gap-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="is_shared"
                            checked={formData.is_shared}
                            onChange={(e) => setFormData({...formData, is_shared: e.target.checked})}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="is_shared">
                            <Users className="h-4 w-4 inline mr-1" />
                            Partager avec l'équipe
                          </Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="subject">Objet de l'email</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        placeholder="Ex: Bienvenue {{contact_first_name}} !"
                        required
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="template-body">Corps de l'email</Label>
                        <div className="text-xs text-gray-500">
                          Cliquez sur une variable pour l'insérer
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {Object.entries(variables).map(([variable, description]) => (
                          <Button
                            key={variable}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => insertVariable(variable)}
                            title={description}
                          >
                            {variable}
                          </Button>
                        ))}
                      </div>
                      
                      <Textarea
                        id="template-body"
                        value={formData.body}
                        onChange={(e) => setFormData({...formData, body: e.target.value})}
                        placeholder="Bonjour {{contact_name}},\n\n..."
                        rows={8}
                        required
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      Créer le template
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* Dialog de modification */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Modifier le template</DialogTitle>
                    <DialogDescription>
                      Modifiez votre template d'email réutilisable
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">Nom du template</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: Email de bienvenue"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-category">Catégorie</Label>
                        <Select 
                          value={formData.category} 
                          onValueChange={(value) => setFormData({...formData, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(categories).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-end gap-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="edit-is_shared"
                            checked={formData.is_shared}
                            onChange={(e) => setFormData({...formData, is_shared: e.target.checked})}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="edit-is_shared">
                            <Users className="h-4 w-4 inline mr-1" />
                            Partager avec l'équipe
                          </Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="edit-subject">Objet de l'email</Label>
                      <Input
                        id="edit-subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        placeholder="Ex: Bienvenue {{contact_first_name}} !"
                        required
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="edit-template-body">Corps de l'email</Label>
                        <div className="text-xs text-gray-500">
                          Cliquez sur une variable pour l'insérer
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {Object.entries(variables).map(([variable, description]) => (
                          <Button
                            key={variable}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const textarea = document.getElementById('edit-template-body') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = formData.body;
                                const newText = text.substring(0, start) + variable + text.substring(end);
                                setFormData({ ...formData, body: newText });
                                
                                setTimeout(() => {
                                  textarea.selectionStart = textarea.selectionEnd = start + variable.length;
                                  textarea.focus();
                                }, 0);
                              }
                            }}
                            title={description}
                          >
                            {variable}
                          </Button>
                        ))}
                      </div>
                      
                      <Textarea
                        id="edit-template-body"
                        value={formData.body}
                        onChange={(e) => setFormData({...formData, body: e.target.value})}
                        placeholder="Bonjour {{contact_name}},\n\n..."
                        rows={8}
                        required
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => {
                      setShowEditDialog(false);
                      resetForm();
                    }}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      Mettre à jour
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Liste des templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getCategoryColor(template.category)}>
                          {categories[template.category]}
                        </Badge>
                        {template.is_shared && (
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            Partagé
                          </Badge>
                        )}
                        {template.usage_count > 0 && (
                          <Badge variant="secondary">
                            {template.usage_count} usage{template.usage_count > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    <strong>Objet:</strong> {template.subject}
                  </p>
                  
                  <p className="text-xs text-gray-500 mb-3 line-clamp-3">
                    {template.body}
                  </p>
                  
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.variables.slice(0, 3).map((variable, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                      {template.variables.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.variables.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Par {template.user?.name || 'Système'}
                    </span>
                    
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePreview(template)}
                        title="Prévisualiser"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDuplicate(template)}
                        title="Dupliquer"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      
                      {template.user?.id === auth.user.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(template)}
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {template.user?.id === auth.user.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTemplateId(template.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Aucun template trouvé</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchTerm ? 'Essayez avec d\'autres mots-clés' : 'Créez votre premier template'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog de preview */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aperçu du template</DialogTitle>
            <DialogDescription>
              Voici comment le template apparaîtra avec les variables remplacées
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-600">Objet</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                {previewData.subject}
              </div>
            </div>
            
            <div>
              <Label className="text-sm text-gray-600">Corps de l'email</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md whitespace-pre-wrap">
                {previewData.body}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce template ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthenticatedLayout>
  );
}