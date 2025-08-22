import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/Components/ui/select';
import { ArrowLeft, Plus, Trash2, Search, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface Contact {
  id: number;
  name: string;
  email: string;
  company?: {
    id: number;
    name: string;
  };
}

interface Company {
  id: number;
  name: string;
}

interface Product {
  id?: number;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Opportunity {
  id: number;
  name: string;
  contact_id?: number;
  company_id?: number;
  stage: string;
  amount: number;
  probability: number;
  expected_close_date: string;
  description?: string;
  contact?: Contact;
  company?: Company;
  products?: Product[];
}

interface Props {
  opportunity: Opportunity;
  auth: any;
}

const stages = [
  { value: 'nouveau', label: 'Nouveau', probability: 10 },
  { value: 'qualification', label: 'Qualification', probability: 25 },
  { value: 'proposition', label: 'Proposition', probability: 50 },
  { value: 'négociation', label: 'Négociation', probability: 75 },
  { value: 'converti', label: 'Converti', probability: 100 },
  { value: 'perdu', label: 'Perdu', probability: 0 },
];

export default function Edit({ opportunity, auth }: Props) {
  const [formData, setFormData] = useState({
    name: opportunity.name,
    contact_id: opportunity.contact_id || '',
    company_id: opportunity.company_id || '',
    stage: opportunity.stage,
    amount: opportunity.amount,
    probability: opportunity.probability,
    expected_close_date: format(new Date(opportunity.expected_close_date), 'yyyy-MM-dd'),
    description: opportunity.description || '',
  });

  const [products, setProducts] = useState<Product[]>(opportunity.products || []);
  const [contactSearch, setContactSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(opportunity.contact || null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(opportunity.company || null);
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [showCompanySearch, setShowCompanySearch] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [processing, setProcessing] = useState(false);

  // Search contacts
  useEffect(() => {
    if (contactSearch.length > 1) {
      const timer = setTimeout(() => {
        fetch(`/api/contacts/search?q=${encodeURIComponent(contactSearch)}`)
          .then(res => res.json())
          .then(data => {
            setContactResults(data.data || []);
          });
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setContactResults([]);
    }
  }, [contactSearch]);

  // Search companies
  useEffect(() => {
    if (companySearch.length > 1) {
      const timer = setTimeout(() => {
        fetch(`/api/companies/search?q=${encodeURIComponent(companySearch)}`)
          .then(res => res.json())
          .then(data => {
            setCompanyResults(data.data || []);
          });
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCompanyResults([]);
    }
  }, [companySearch]);

  // Calculate total amount
  useEffect(() => {
    const total = products.reduce((sum, product) => sum + product.total, 0);
    setFormData(prev => ({ ...prev, amount: total }));
  }, [products]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStageChange = (value: string) => {
    const stage = stages.find(s => s.value === value);
    setFormData(prev => ({ 
      ...prev, 
      stage: value,
      probability: stage?.probability || prev.probability
    }));
  };

  const selectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData(prev => ({ ...prev, contact_id: contact.id }));
    setContactSearch(contact.name);
    setShowContactSearch(false);
    
    // Auto-fill company if contact has one
    if (contact.company) {
      setSelectedCompany(contact.company);
      setFormData(prev => ({ ...prev, company_id: contact.company!.id }));
      setCompanySearch(contact.company.name);
    }
  };

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);
    setFormData(prev => ({ ...prev, company_id: company.id }));
    setCompanySearch(company.name);
    setShowCompanySearch(false);
  };

  const clearContact = () => {
    setSelectedContact(null);
    setFormData(prev => ({ ...prev, contact_id: '' }));
    setContactSearch('');
  };

  const clearCompany = () => {
    setSelectedCompany(null);
    setFormData(prev => ({ ...prev, company_id: '' }));
    setCompanySearch('');
  };

  const addProduct = () => {
    setProducts([...products, { name: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const updateProduct = (index: number, field: string, value: any) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    
    // Recalculate total for the product
    if (field === 'quantity' || field === 'unit_price') {
      newProducts[index].total = newProducts[index].quantity * newProducts[index].unit_price;
    }
    
    setProducts(newProducts);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    const data = {
      ...formData,
      products: products.filter(p => p.name && p.quantity > 0),
    };

    router.put(`/api/opportunities/${opportunity.id}`, data, {
      onSuccess: () => {
        router.visit(`/sales/${opportunity.id}`);
      },
      onError: (errors) => {
        setErrors(errors);
        setProcessing(false);
      },
      onFinish: () => {
        setProcessing(false);
      },
    });
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <div className="flex items-center gap-4">
          <Link href={`/sales/${opportunity.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-2xl font-bold">Modifier l'opportunité</h2>
        </div>
      }
    >
      <Head title="Modifier l'opportunité" />

      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom de l'opportunité *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Contact principal</Label>
                    <div className="relative">
                      {selectedContact ? (
                        <div className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                          <span className="text-sm">{selectedContact.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearContact}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              type="text"
                              value={contactSearch}
                              onChange={(e) => {
                                setContactSearch(e.target.value);
                                setShowContactSearch(true);
                              }}
                              onFocus={() => setShowContactSearch(true)}
                              placeholder="Rechercher un contact..."
                              className="pl-10"
                            />
                          </div>
                          {showContactSearch && contactResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                              {contactResults.map((contact) => (
                                <button
                                  key={contact.id}
                                  type="button"
                                  onClick={() => selectContact(contact)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                >
                                  <div className="font-medium">{contact.name}</div>
                                  <div className="text-sm text-gray-500">{contact.email}</div>
                                  {contact.company && (
                                    <div className="text-xs text-gray-400">{contact.company.name}</div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Entreprise</Label>
                    <div className="relative">
                      {selectedCompany ? (
                        <div className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                          <span className="text-sm">{selectedCompany.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearCompany}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              type="text"
                              value={companySearch}
                              onChange={(e) => {
                                setCompanySearch(e.target.value);
                                setShowCompanySearch(true);
                              }}
                              onFocus={() => setShowCompanySearch(true)}
                              placeholder="Rechercher une entreprise..."
                              className="pl-10"
                            />
                          </div>
                          {showCompanySearch && companyResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                              {companyResults.map((company) => (
                                <button
                                  key={company.id}
                                  type="button"
                                  onClick={() => selectCompany(company)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                >
                                  <div className="font-medium">{company.name}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stage and Probability */}
            <Card>
              <CardHeader>
                <CardTitle>Étape et probabilité</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stage">Étape *</Label>
                    <Select value={formData.stage} onValueChange={handleStageChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une étape" />
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
                    <Label htmlFor="probability">Probabilité (%) *</Label>
                    <Input
                      id="probability"
                      name="probability"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="expected_close_date">Date de clôture prévue *</Label>
                  <Input
                    id="expected_close_date"
                    name="expected_close_date"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Produits/Services</CardTitle>
                  <Button type="button" onClick={addProduct} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un produit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Aucun produit ajouté. Cliquez sur "Ajouter un produit" pour commencer.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {products.map((product, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 p-4 border rounded-lg">
                        <div className="col-span-5">
                          <Input
                            placeholder="Nom du produit"
                            value={product.name}
                            onChange={(e) => updateProduct(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Qté"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Prix unitaire"
                            min="0"
                            step="0.01"
                            value={product.unit_price}
                            onChange={(e) => updateProduct(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="text"
                            value={formatCurrency(product.total)}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProduct(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right border-t pt-4">
                      <p className="text-lg font-semibold">
                        Total: {formatCurrency(formData.amount)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Informations complémentaires</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Ajoutez des notes ou des détails sur cette opportunité..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href={`/sales/${opportunity.id}`}>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={processing}>
                {processing ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}