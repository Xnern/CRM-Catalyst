import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Building2, 
  DollarSign, 
  Calendar,
  Target,
  AlertCircle,
  Plus,
  X,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface Contact {
  id: number;
  name: string;
  email: string;
  company?: {
    id: number;
    name: string;
  };
}

interface Product {
  name: string;
  quantity: number;
  price: number;
}

interface Props {
  contact?: Contact;
  stages: Array<{ value: string; label: string }>;
  leadSources: string[];
}

export default function CreateOpportunity({ contact, stages, leadSources }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    description: '',
    contact_id: contact?.id || '',
    company_id: contact?.company?.id || '',
    amount: 0,
    currency: 'EUR',
    probability: 20,
    stage: 'nouveau',
    expected_close_date: '',
    lead_source: '',
    next_step: '',
    products: [] as Product[],
    competitors: '',
  });

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [searchingCompanies, setSearchingCompanies] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(contact || null);
  const [newProduct, setNewProduct] = useState<Product>({ name: '', quantity: 1, price: 0 });
  const [showProductForm, setShowProductForm] = useState(false);

  // Calculer le montant total basé sur les produits
  useEffect(() => {
    const total = data.products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
    setData('amount', total);
  }, [data.products]);

  // Ajuster la probabilité selon l'étape
  useEffect(() => {
    const probabilities: Record<string, number> = {
      'nouveau': 20,
      'qualification': 35,
      'proposition_envoyee': 60,
      'negociation': 80,
      'converti': 100,
      'perdu': 0,
    };
    setData('probability', probabilities[data.stage] || 50);
  }, [data.stage]);

  // Générer le nom de l'opportunité
  useEffect(() => {
    if (selectedContact && data.products.length > 0) {
      setData('name', `Opportunité ${selectedContact.name} - ${data.products[0].name}`);
    }
  }, [selectedContact, data.products]);

  const searchContacts = async (query: string) => {
    if (query.length < 2) return;
    setSearchingContacts(true);
    try {
      const response = await fetch(`/api/contacts/search?q=${query}`);
      const result = await response.json();
      setContacts(result.data || []);
    } catch (error) {
      console.error('Error searching contacts:', error);
    } finally {
      setSearchingContacts(false);
    }
  };

  const searchCompanies = async (query: string) => {
    if (query.length < 2) return;
    setSearchingCompanies(true);
    try {
      const response = await fetch(`/api/companies/search?q=${query}`);
      const result = await response.json();
      setCompanies(result.data || []);
    } catch (error) {
      console.error('Error searching companies:', error);
    } finally {
      setSearchingCompanies(false);
    }
  };

  const selectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setData({
      ...data,
      contact_id: contact.id,
      company_id: contact.company?.id || data.company_id,
    });
    setContacts([]);
  };

  const addProduct = () => {
    if (!newProduct.name || newProduct.price <= 0) {
      toast.error('Veuillez remplir tous les champs du produit');
      return;
    }
    setData('products', [...data.products, { ...newProduct }]);
    setNewProduct({ name: '', quantity: 1, price: 0 });
    setShowProductForm(false);
  };

  const removeProduct = (index: number) => {
    setData('products', data.products.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!data.contact_id) {
      toast.error('Veuillez sélectionner un contact');
      return;
    }

    if (data.products.length === 0) {
      toast.error('Veuillez ajouter au moins un produit/service');
      return;
    }

    // Use fetch API for better control over the response
    fetch('/api/opportunities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
      },
      body: JSON.stringify(data),
    })
      .then(response => response.json())
      .then(result => {
        if (result.id) {
          toast.success('Opportunité créée avec succès');
          // Navigate to the detail page
          router.visit(`/opportunities/${result.id}`);
        } else {
          toast.error('Erreur lors de la création de l\'opportunité');
        }
      })
      .catch(() => {
        toast.error('Erreur lors de la création de l\'opportunité');
      });
  };

  const getStageInfo = (stage: string) => {
    const info: Record<string, { color: string; description: string; nextSteps: string }> = {
      'nouveau': {
        color: 'bg-blue-100 text-blue-800',
        description: 'Premier contact avec le prospect',
        nextSteps: 'Qualifier le besoin, identifier le budget'
      },
      'qualification': {
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Évaluation du potentiel et des besoins',
        nextSteps: 'Préparer et envoyer une proposition'
      },
      'proposition_envoyee': {
        color: 'bg-purple-100 text-purple-800',
        description: 'Proposition commerciale envoyée',
        nextSteps: 'Relancer le client, organiser une présentation'
      },
      'negociation': {
        color: 'bg-orange-100 text-orange-800',
        description: 'Discussion des termes et conditions',
        nextSteps: 'Finaliser les détails, préparer le contrat'
      },
    };
    return info[stage] || { color: 'bg-gray-100', description: '', nextSteps: '' };
  };

  const stageInfo = getStageInfo(data.stage);

  return (
    <AuthenticatedLayout
      header={
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold leading-tight text-gray-800">
            Nouvelle Opportunité
          </h2>
          <Link href="/opportunities">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      }
    >
      <Head title="Nouvelle Opportunité" />

      <div className="py-12">
        <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Contact et Entreprise */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact et Entreprise
                </CardTitle>
                <CardDescription>
                  Sélectionnez le contact principal et l'entreprise associée
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedContact ? (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{selectedContact.name}</p>
                        <p className="text-sm text-gray-600">{selectedContact.email}</p>
                        {selectedContact.company && (
                          <p className="text-sm text-gray-600">
                            <Building2 className="inline h-3 w-3 mr-1" />
                            {selectedContact.company.name}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedContact(null);
                          setData('contact_id', '');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="contact_search">Rechercher un contact *</Label>
                    <Input
                      id="contact_search"
                      type="text"
                      placeholder="Tapez pour rechercher..."
                      onChange={(e) => searchContacts(e.target.value)}
                    />
                    {searchingContacts && (
                      <p className="text-sm text-gray-500 mt-2">Recherche...</p>
                    )}
                    {contacts.length > 0 && (
                      <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                        {contacts.map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            className="w-full text-left p-2 hover:bg-gray-50 border-b last:border-b-0"
                            onClick={() => selectContact(contact)}
                          >
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-gray-600">{contact.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {errors.contact_id && (
                  <p className="text-red-500 text-sm">{errors.contact_id}</p>
                )}
              </CardContent>
            </Card>

            {/* Informations de l'opportunité */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Informations de l'Opportunité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nom de l'opportunité *</Label>
                    <Input
                      id="name"
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                      placeholder="Ex: Contrat annuel CRM"
                      required
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="stage">Étape *</Label>
                    <Select value={data.stage} onValueChange={(value) => setData('stage', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="lead_source">Source</Label>
                    <Select value={data.lead_source} onValueChange={(value) => setData('lead_source', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une source" />
                      </SelectTrigger>
                      <SelectContent>
                        {leadSources.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="expected_close_date">Date de clôture prévue</Label>
                    <Input
                      id="expected_close_date"
                      type="date"
                      value={data.expected_close_date}
                      onChange={(e) => setData('expected_close_date', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Décrivez l'opportunité, les besoins du client..."
                    rows={3}
                  />
                </div>

                {stageInfo.nextSteps && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Prochaines étapes suggérées :</strong> {stageInfo.nextSteps}
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="next_step">Prochaine action</Label>
                  <Input
                    id="next_step"
                    value={data.next_step}
                    onChange={(e) => setData('next_step', e.target.value)}
                    placeholder="Ex: Appeler pour confirmer le budget"
                  />
                </div>

                <div>
                  <Label htmlFor="competitors">Concurrents</Label>
                  <Input
                    id="competitors"
                    value={data.competitors}
                    onChange={(e) => setData('competitors', e.target.value)}
                    placeholder="Ex: Salesforce, HubSpot"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Produits et Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Produits et Services
                </CardTitle>
                <CardDescription>
                  Ajoutez les produits ou services concernés par cette opportunité
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.products.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        {product.quantity} x {formatCurrency(product.price)} = {formatCurrency(product.quantity * product.price)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {showProductForm ? (
                  <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Nom du produit</Label>
                        <Input
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          placeholder="Ex: Licence CRM"
                        />
                      </div>
                      <div>
                        <Label>Quantité</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newProduct.quantity}
                          onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <Label>Prix unitaire (€)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" onClick={addProduct} size="sm">
                        Ajouter
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowProductForm(false);
                          setNewProduct({ name: '', quantity: 1, price: 0 });
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProductForm(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un produit
                  </Button>
                )}

                {data.products.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Ajoutez au moins un produit ou service pour calculer le montant de l'opportunité
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Informations Financières */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Informations Financières
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Montant total</Label>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(data.amount)}
                    </div>
                    <p className="text-sm text-gray-500">Calculé automatiquement</p>
                  </div>

                  <div>
                    <Label htmlFor="probability">Probabilité de conversion (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="probability"
                        type="number"
                        min="0"
                        max="100"
                        value={data.probability}
                        onChange={(e) => setData('probability', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Ajusté selon l'étape</p>
                  </div>

                  <div>
                    <Label>Montant pondéré</Label>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(data.amount * data.probability / 100)}
                    </div>
                    <p className="text-sm text-gray-500">Montant × Probabilité</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/opportunities">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={processing} className="bg-primary-600 hover:bg-primary-700">
                <Save className="h-4 w-4 mr-2" />
                {processing ? 'Création...' : 'Créer l\'opportunité'}
              </Button>
            </div>

          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}