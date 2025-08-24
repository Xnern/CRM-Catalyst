import React, { useState, useEffect } from 'react';
import { Bell, Clock, AlertCircle, Calendar, CheckCircle, X, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Badge } from '@/Components/ui/badge';
import { Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';

interface Reminder {
  id: number;
  title: string;
  reminder_date: string;
  type: string;
  priority: string;
  is_overdue: boolean;
  is_due_today: boolean;
  opportunity_name?: string;
  contact_name?: string;
}

interface RemindersCount {
  overdue: number;
  today: number;
  upcoming: number;
}

export default function RemindersNotification() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [counts, setCounts] = useState<RemindersCount>({ overdue: 0, today: 0, upcoming: 0 });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_date: '',
    reminder_time: '',
    type: 'follow_up',
    priority: 'medium',
  });

  const fetchReminders = async () => {
    try {
      const [remindersRes, countsRes] = await Promise.all([
        fetch('/api/rappels/upcoming'),
        fetch('/api/rappels/count')
      ]);
      
      if (remindersRes.ok && countsRes.ok) {
        const remindersData = await remindersRes.json();
        const countsData = await countsRes.json();
        
        setReminders(remindersData);
        setCounts(countsData);
        
        // Notification pour les rappels en retard
        if (countsData.overdue > 0) {
          toast.warning(`Vous avez ${countsData.overdue} rappel(s) en retard`, {
            action: {
              label: 'Voir',
              onClick: () => router.visit('/rappels')
            }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    
    // Rafraîchir toutes les minutes
    const interval = setInterval(fetchReminders, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleComplete = async (id: number) => {
    try {
      const response = await fetch(`/api/rappels/${id}/complete`, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });
      
      if (response.ok) {
        toast.success('Rappel complété');
        fetchReminders();
      }
    } catch (error) {
      toast.error('Erreur lors de la complétion du rappel');
    }
  };

  const handleSnooze = async (id: number, minutes: number) => {
    try {
      const response = await fetch(`/api/rappels/${id}/snooze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ minutes }),
      });
      
      if (response.ok) {
        const label = minutes >= 1440 ? 'demain' : 
                     minutes >= 60 ? `${minutes / 60} heure${minutes > 60 ? 's' : ''}` : 
                     `${minutes} minutes`;
        toast.success(`Rappel reporté ${label}`);
        // Rafraîchir immédiatement les données
        setTimeout(() => fetchReminders(), 500);
      }
    } catch (error) {
      toast.error('Erreur lors du report du rappel');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dateTime = `${formData.reminder_date} ${formData.reminder_time}`;
    
    try {
      const response = await fetch('/rappels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          ...formData,
          reminder_date: dateTime,
        }),
      });
      
      if (response.ok) {
        toast.success('Rappel créé avec succès');
        setShowCreateDialog(false);
        setFormData({
          title: '',
          description: '',
          reminder_date: '',
          reminder_time: '',
          type: 'follow_up',
          priority: 'medium',
        });
        fetchReminders();
      } else {
        toast.error('Erreur lors de la création du rappel');
      }
    } catch (error) {
      toast.error('Erreur lors de la création du rappel');
    }
  };

  const totalCount = counts.overdue + counts.today + counts.upcoming;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Faible';
      default: return priority;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Calendar className="h-3 w-3" />;
      case 'call': return '📞';
      case 'email': return '✉️';
      case 'deadline': return <AlertCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'follow_up': return 'Suivi';
      case 'meeting': return 'Réunion';
      case 'call': return 'Appel';
      case 'email': return 'Email';
      case 'deadline': return 'Échéance';
      case 'other': return 'Autre';
      default: return type;
    }
  };

  return (
    <>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative hover:bg-muted">
          <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          {totalCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
            >
              {totalCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Rappels et Notifications</span>
          <Link href="/rappels" className="text-xs text-blue-600 hover:underline">
            Tout voir
          </Link>
        </DropdownMenuLabel>
        
        {counts.overdue > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                {counts.overdue} rappel(s) en retard
              </div>
            </div>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="px-2 py-4 text-center text-sm text-gray-500">
            Chargement...
          </div>
        ) : reminders.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-gray-500">
            Aucun rappel à venir
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="px-2 py-2 hover:bg-gray-50 border-b last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(reminder.type)}
                      <span className={`text-sm font-medium ${reminder.is_overdue ? 'text-red-600' : ''}`}>
                        {reminder.title}
                      </span>
                      <Badge variant="outline" className={`text-xs ${getPriorityColor(reminder.priority)}`}>
                        {getPriorityLabel(reminder.priority)}
                      </Badge>
                    </div>
                    
                    {(reminder.opportunity_name || reminder.contact_name) && (
                      <div className="text-xs text-gray-500 mt-1">
                        {reminder.opportunity_name && `Opp: ${reminder.opportunity_name}`}
                        {reminder.opportunity_name && reminder.contact_name && ' • '}
                        {reminder.contact_name && `Contact: ${reminder.contact_name}`}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className={`text-xs ${reminder.is_overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {reminder.is_overdue ? 'En retard: ' : ''}
                        {format(new Date(reminder.reminder_date), 'dd MMM à HH:mm', { locale: fr })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleComplete(reminder.id)}
                      className="h-7 w-7 p-0"
                      title="Marquer comme complété"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Clock className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel className="text-xs">Reporter</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleSnooze(reminder.id, 15)}>
                          15 minutes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSnooze(reminder.id, 60)}>
                          1 heure
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSnooze(reminder.id, 240)}>
                          4 heures
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSnooze(reminder.id, 1440)}>
                          Demain
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        <div className="px-2 py-2 space-y-2">
          <Button 
            variant="default" 
            className="w-full text-sm"
            onClick={() => {
              setOpen(false);
              setShowCreateDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer un rappel
          </Button>
          
          <Link href="/rappels" className="block">
            <Button variant="outline" className="w-full text-sm">
              <Bell className="h-4 w-4 mr-2" />
              Gérer tous les rappels
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
    
    {/* Dialog de création rapide */}
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleCreateSubmit}>
          <DialogHeader>
            <DialogTitle>Créer un rappel rapide</DialogTitle>
            <DialogDescription>
              Ajoutez rapidement un nouveau rappel
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quick-title">Titre *</Label>
              <Input
                id="quick-title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Appeler le client"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="quick-description">Description</Label>
              <Textarea
                id="quick-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Détails du rappel..."
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quick-date">Date *</Label>
                <Input
                  id="quick-date"
                  type="date"
                  value={formData.reminder_date}
                  onChange={(e) => setFormData({...formData, reminder_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="quick-time">Heure *</Label>
                <Input
                  id="quick-time"
                  type="time"
                  value={formData.reminder_time}
                  onChange={(e) => setFormData({...formData, reminder_time: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quick-type">Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({...formData, type: value})}
                >
                  <SelectTrigger id="quick-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow_up">Suivi</SelectItem>
                    <SelectItem value="meeting">Réunion</SelectItem>
                    <SelectItem value="call">Appel</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="deadline">Échéance</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="quick-priority">Priorité</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData({...formData, priority: value})}
                >
                  <SelectTrigger id="quick-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Boutons rapides pour le temps */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Création rapide</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    now.setMinutes(now.getMinutes() + 30);
                    setFormData({
                      ...formData,
                      reminder_date: now.toISOString().split('T')[0],
                      reminder_time: now.toTimeString().slice(0, 5)
                    });
                  }}
                >
                  Dans 30 min
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    now.setHours(now.getHours() + 1);
                    setFormData({
                      ...formData,
                      reminder_date: now.toISOString().split('T')[0],
                      reminder_time: now.toTimeString().slice(0, 5)
                    });
                  }}
                >
                  Dans 1h
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(9, 0, 0, 0);
                    setFormData({
                      ...formData,
                      reminder_date: tomorrow.toISOString().split('T')[0],
                      reminder_time: '09:00'
                    });
                  }}
                >
                  Demain 9h
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Créer le rappel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}