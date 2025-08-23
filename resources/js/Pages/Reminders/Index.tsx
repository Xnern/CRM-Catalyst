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
import { 
  Bell, Clock, AlertCircle, Calendar, CheckCircle, 
  Plus, Trash2, Edit, ChevronRight, Filter, 
  Phone, Mail, Users, Target, Repeat
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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

interface Reminder {
  id: number;
  title: string;
  description?: string;
  reminder_date: string;
  type: string;
  priority: string;
  status: string;
  is_overdue: boolean;
  is_due_today: boolean;
  is_due_soon: boolean;
  opportunity?: {
    id: number;
    name: string;
  };
  contact?: {
    id: number;
    name: string;
  };
}

interface Props {
  reminders: {
    overdue: Reminder[];
    today: Reminder[];
    upcoming: Reminder[];
    completed: Reminder[];
  };
  types: Record<string, string>;
  priorities: Record<string, string>;
  stats: {
    overdue: number;
    today: number;
    upcoming: number;
    total: number;
  };
  auth: any;
}

export default function RemindersIndex({ reminders, types, priorities, stats, auth }: Props) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [deleteReminderId, setDeleteReminderId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_date: '',
    reminder_time: '',
    type: 'follow_up',
    priority: 'medium',
    is_recurring: false,
    recurrence_pattern: 'daily',
    recurrence_interval: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dateTime = `${formData.reminder_date} ${formData.reminder_time}`;
    
    router.post('/reminders', {
      ...formData,
      reminder_date: dateTime,
    }, {
      onSuccess: () => {
        toast.success('Rappel créé avec succès');
        setShowCreateDialog(false);
        setFormData({
          title: '',
          description: '',
          reminder_date: '',
          reminder_time: '',
          type: 'follow_up',
          priority: 'medium',
          is_recurring: false,
          recurrence_pattern: 'daily',
          recurrence_interval: 1,
        });
      },
      onError: () => {
        toast.error('Erreur lors de la création du rappel');
      }
    });
  };

  const handleComplete = (id: number) => {
    router.post(`/api/reminders/${id}/complete`, {}, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Rappel marqué comme complété');
      }
    });
  };

  const handleSnooze = (id: number, minutes: number) => {
    router.post(`/api/reminders/${id}/snooze`, { minutes }, {
      preserveScroll: true,
      onSuccess: () => {
        const label = minutes >= 1440 ? 'à demain' : 
                     minutes >= 60 ? `de ${minutes / 60} heure${minutes > 60 ? 's' : ''}` : 
                     `de ${minutes} minutes`;
        toast.success(`Rappel reporté ${label}`);
        router.reload();
      },
      onError: () => {
        toast.error('Erreur lors du report du rappel');
      }
    });
  };

  const confirmDelete = () => {
    if (!deleteReminderId) return;
    
    setIsDeleting(true);
    router.delete(`/reminders/${deleteReminderId}`, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Rappel supprimé');
        setDeleteReminderId(null);
      },
      onError: () => {
        toast.error('Erreur lors de la suppression');
      },
      onFinish: () => {
        setIsDeleting(false);
      }
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Users className="h-4 w-4" />;
      case 'deadline': return <Target className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const ReminderCard = ({ reminder, showActions = true }: { reminder: Reminder; showActions?: boolean }) => (
    <Card className={`${reminder.is_overdue ? 'border-red-300 bg-red-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getTypeIcon(reminder.type)}
              <h4 className="font-medium">{reminder.title}</h4>
              <Badge className={getPriorityColor(reminder.priority)}>
                {priorities[reminder.priority]}
              </Badge>
            </div>
            
            {reminder.description && (
              <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(reminder.reminder_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </div>
              
              {reminder.opportunity && (
                <div className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  Opp: {reminder.opportunity.name}
                </div>
              )}
              
              {reminder.contact && (
                <div className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  Contact: {reminder.contact.name}
                </div>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleComplete(reminder.id)}
                title="Marquer comme complété"
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Reporter"
                  >
                    <Clock className="h-4 w-4 text-blue-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel className="text-xs">Reporter</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleSnooze(reminder.id, 5)}>
                    5 minutes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSnooze(reminder.id, 15)}>
                    15 minutes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSnooze(reminder.id, 30)}>
                    30 minutes
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
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteReminderId(reminder.id)}
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Rappels et Notifications</h2>}>
      <Head title="Rappels" />
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">En retard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Aujourd'hui</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">À venir</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.upcoming}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Bar */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {Object.entries(types).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {Object.entries(priorities).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau rappel
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Créer un rappel</DialogTitle>
                    <DialogDescription>
                      Ajoutez un nouveau rappel pour ne rien oublier
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Titre</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.reminder_date}
                          onChange={(e) => setFormData({...formData, reminder_date: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="time">Heure</Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.reminder_time}
                          onChange={(e) => setFormData({...formData, reminder_time: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="type">Type</Label>
                        <Select 
                          value={formData.type} 
                          onValueChange={(value) => setFormData({...formData, type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(types).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="priority">Priorité</Label>
                        <Select 
                          value={formData.priority} 
                          onValueChange={(value) => setFormData({...formData, priority: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorities).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="submit">Créer le rappel</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Reminders Sections */}
          {reminders.overdue.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                En retard ({reminders.overdue.length})
              </h3>
              <div className="space-y-3">
                {reminders.overdue.map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            </div>
          )}

          {reminders.today.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-blue-600 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Aujourd'hui ({reminders.today.length})
              </h3>
              <div className="space-y-3">
                {reminders.today.map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            </div>
          )}

          {reminders.upcoming.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-green-600 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                À venir ({reminders.upcoming.length})
              </h3>
              <div className="space-y-3">
                {reminders.upcoming.map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            </div>
          )}

          {reminders.completed.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-gray-600 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Complétés ({reminders.completed.length})
              </h3>
              <div className="space-y-3 opacity-60">
                {reminders.completed.map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} showActions={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteReminderId} onOpenChange={() => setDeleteReminderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce rappel ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthenticatedLayout>
  );
}