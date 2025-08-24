import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/Components/ui/select';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/Components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/Components/ui/popover';
import { 
  User, 
  Building, 
  Target, 
  Bell, 
  Search, 
  X,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeColors } from '@/hooks/useThemeColors';

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

interface Opportunity {
  id: number;
  name: string;
  stage: string;
  amount: number;
  contact?: Contact;
  company?: Company;
}

interface Reminder {
  id: number;
  title: string;
  reminder_date: string;
  type: string;
}

interface CRMEventSelectorProps {
  selectedContactId?: number;
  selectedCompanyId?: number;
  selectedOpportunityId?: number;
  selectedReminderId?: number;
  onContactChange: (contactId?: number) => void;
  onCompanyChange: (companyId?: number) => void;
  onOpportunityChange: (opportunityId?: number) => void;
  onReminderChange: (reminderId?: number) => void;
}

const CRMEventSelector: React.FC<CRMEventSelectorProps> = ({
  selectedContactId,
  selectedCompanyId,
  selectedOpportunityId,
  selectedReminderId,
  onContactChange,
  onCompanyChange,
  onOpportunityChange,
  onReminderChange,
}) => {
  const themeColors = useThemeColors();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  const [contactSearchOpen, setContactSearchOpen] = useState(false);
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [opportunitySearchOpen, setOpportunitySearchOpen] = useState(false);
  const [reminderSearchOpen, setReminderSearchOpen] = useState(false);
  
  const [contactSearch, setContactSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [opportunitySearch, setOpportunitySearch] = useState('');
  const [reminderSearch, setReminderSearch] = useState('');

  // Load data on mount
  useEffect(() => {
    loadContacts();
    loadCompanies();
    loadOpportunities();
    loadReminders();
  }, []);

  const loadContacts = async (search = '') => {
    try {
      const response = await fetch(`/api/contacts/search?q=${encodeURIComponent(search)}&limit=20`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setContacts(Array.isArray(data) ? data : []);
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setContacts([]);
    }
  };

  const loadCompanies = async (search = '') => {
    try {
      const response = await fetch(`/api/companies/search?q=${encodeURIComponent(search)}&limit=20`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setCompanies(Array.isArray(data) ? data : []);
      } else {
        setCompanies([]);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
      setCompanies([]);
    }
  };

  const loadOpportunities = async (search = '') => {
    try {
      const response = await fetch(`/api/opportunites/search?q=${encodeURIComponent(search)}&limit=20`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setOpportunities(Array.isArray(data) ? data : []);
      } else {
        setOpportunities([]);
      }
    } catch (error) {
      console.error('Failed to load opportunities:', error);
      setOpportunities([]);
    }
  };

  const loadReminders = async (search = '') => {
    try {
      const response = await fetch(`/api/rappels/search?q=${encodeURIComponent(search)}&limit=20`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setReminders(Array.isArray(data) ? data : []);
      } else {
        setReminders([]);
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
      setReminders([]);
    }
  };

  // Search handlers
  useEffect(() => {
    if (contactSearch) {
      const delayedSearch = setTimeout(() => loadContacts(contactSearch), 300);
      return () => clearTimeout(delayedSearch);
    }
  }, [contactSearch]);

  useEffect(() => {
    if (companySearch) {
      const delayedSearch = setTimeout(() => loadCompanies(companySearch), 300);
      return () => clearTimeout(delayedSearch);
    }
  }, [companySearch]);

  useEffect(() => {
    if (opportunitySearch) {
      const delayedSearch = setTimeout(() => loadOpportunities(opportunitySearch), 300);
      return () => clearTimeout(delayedSearch);
    }
  }, [opportunitySearch]);

  useEffect(() => {
    if (reminderSearch) {
      const delayedSearch = setTimeout(() => loadReminders(reminderSearch), 300);
      return () => clearTimeout(delayedSearch);
    }
  }, [reminderSearch]);

  const selectedContact = Array.isArray(contacts) ? contacts.find(c => c.id === selectedContactId) : undefined;
  const selectedCompany = Array.isArray(companies) ? companies.find(c => c.id === selectedCompanyId) : undefined;
  const selectedOpportunity = Array.isArray(opportunities) ? opportunities.find(o => o.id === selectedOpportunityId) : undefined;
  const selectedReminder = Array.isArray(reminders) ? reminders.find(r => r.id === selectedReminderId) : undefined;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" {...themeColors.getPrimaryClasses('text')} />
          Intégration CRM
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Associer cet événement avec des données CRM existantes
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Contact Selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Contact
          </Label>
          <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={contactSearchOpen}
                className="w-full justify-between"
              >
                {selectedContact ? (
                  <div className="flex items-center gap-2">
                    <span>{selectedContact.name}</span>
                    {selectedContact.company && (
                      <Badge variant="outline" className="text-xs">
                        {selectedContact.company.name}
                      </Badge>
                    )}
                  </div>
                ) : (
                  "Sélectionner un contact..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Rechercher un contact..." 
                  value={contactSearch}
                  onValueChange={setContactSearch}
                />
                <CommandEmpty>Aucun contact trouvé.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {selectedContact && (
                      <CommandItem
                        value="clear"
                        onSelect={() => {
                          onContactChange(undefined);
                          setContactSearchOpen(false);
                        }}
                        onClick={() => {
                          onContactChange(undefined);
                          setContactSearchOpen(false);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Supprimer la sélection
                      </CommandItem>
                    )}
                    {contacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={contact.name}
                        onSelect={() => {
                          onContactChange(contact.id);
                          setContactSearchOpen(false);
                        }}
                        onClick={() => {
                          onContactChange(contact.id);
                          setContactSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedContactId === contact.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{contact.name}</span>
                          <span className="text-xs text-muted-foreground">{contact.email}</span>
                          {contact.company && (
                            <Badge variant="outline" className="text-xs w-fit mt-1">
                              {contact.company.name}
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Company Selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Entreprise
          </Label>
          <Popover open={companySearchOpen} onOpenChange={setCompanySearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={companySearchOpen}
                className="w-full justify-between"
              >
                {selectedCompany ? selectedCompany.name : "Sélectionner une entreprise..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Rechercher une entreprise..." 
                  value={companySearch}
                  onValueChange={setCompanySearch}
                />
                <CommandEmpty>Aucune entreprise trouvée.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {selectedCompany && (
                      <CommandItem
                        value="clear"
                        onSelect={() => {
                          onCompanyChange(undefined);
                          setCompanySearchOpen(false);
                        }}
                        onClick={() => {
                          onCompanyChange(undefined);
                          setCompanySearchOpen(false);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Supprimer la sélection
                      </CommandItem>
                    )}
                    {companies.map((company) => (
                      <CommandItem
                        key={company.id}
                        value={company.name}
                        onSelect={() => {
                          onCompanyChange(company.id);
                          setCompanySearchOpen(false);
                        }}
                        onClick={() => {
                          onCompanyChange(company.id);
                          setCompanySearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCompanyId === company.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {company.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Opportunity Selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Opportunité
          </Label>
          <Popover open={opportunitySearchOpen} onOpenChange={setOpportunitySearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={opportunitySearchOpen}
                className="w-full justify-between"
              >
                {selectedOpportunity ? (
                  <div className="flex items-center gap-2">
                    <span>{selectedOpportunity.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedOpportunity.stage}
                    </Badge>
                  </div>
                ) : (
                  "Sélectionner une opportunité..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Rechercher une opportunité..." 
                  value={opportunitySearch}
                  onValueChange={setOpportunitySearch}
                />
                <CommandEmpty>Aucune opportunité trouvée.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {selectedOpportunity && (
                      <CommandItem
                        value="clear"
                        onSelect={() => {
                          onOpportunityChange(undefined);
                          setOpportunitySearchOpen(false);
                        }}
                        onClick={() => {
                          onOpportunityChange(undefined);
                          setOpportunitySearchOpen(false);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Supprimer la sélection
                      </CommandItem>
                    )}
                    {opportunities.map((opportunity) => (
                      <CommandItem
                        key={opportunity.id}
                        value={opportunity.name}
                        onSelect={() => {
                          onOpportunityChange(opportunity.id);
                          setOpportunitySearchOpen(false);
                        }}
                        onClick={() => {
                          onOpportunityChange(opportunity.id);
                          setOpportunitySearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedOpportunityId === opportunity.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{opportunity.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {opportunity.stage}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Intl.NumberFormat('fr-FR', {
                                style: 'currency',
                                currency: 'EUR'
                              }).format(opportunity.amount)}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Reminder Selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Rappel
          </Label>
          <Popover open={reminderSearchOpen} onOpenChange={setReminderSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={reminderSearchOpen}
                className="w-full justify-between"
              >
                {selectedReminder ? (
                  <div className="flex items-center gap-2">
                    <span>{selectedReminder.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedReminder.type}
                    </Badge>
                  </div>
                ) : (
                  "Sélectionner un rappel..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Rechercher un rappel..." 
                  value={reminderSearch}
                  onValueChange={setReminderSearch}
                />
                <CommandEmpty>Aucun rappel trouvé.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {selectedReminder && (
                      <CommandItem
                        value="clear"
                        onSelect={() => {
                          onReminderChange(undefined);
                          setReminderSearchOpen(false);
                        }}
                        onClick={() => {
                          onReminderChange(undefined);
                          setReminderSearchOpen(false);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Supprimer la sélection
                      </CommandItem>
                    )}
                    {reminders.map((reminder) => (
                      <CommandItem
                        key={reminder.id}
                        value={reminder.title}
                        onSelect={() => {
                          onReminderChange(reminder.id);
                          setReminderSearchOpen(false);
                        }}
                        onClick={() => {
                          onReminderChange(reminder.id);
                          setReminderSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedReminderId === reminder.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{reminder.title}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {reminder.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(reminder.reminder_date).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
};

export default CRMEventSelector;