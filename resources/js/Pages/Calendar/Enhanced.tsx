import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    useGetGoogleAuthUrlQuery,
    useGetGoogleCalendarEventsQuery,
    useCreateGoogleCalendarEventMutation,
    useUpdateGoogleCalendarEventMutation,
    useDeleteGoogleCalendarEventMutation,
    useLogoutGoogleCalendarMutation,
    useGetLocalCalendarEventsQuery,
    useCreateLocalCalendarEventMutation,
    useUpdateLocalCalendarEventMutation,
    useDeleteLocalCalendarEventMutation,
} from '@/services/api';
import { GoogleCalendarEvent, CreateCalendarEventPayload } from '@/types/GoogleCalendarEvent';
import { LocalCalendarEvent, LocalEventPayload, EventTypes, PriorityLevels } from '@/types/LocalCalendarEvent';

import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Checkbox } from '@/Components/ui/checkbox';
import { Textarea } from '@/Components/ui/textarea';
import { toast } from 'sonner';
import {
  ExternalLink,
  Loader2,
  Video,
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Trash,
  PlusCircle,
  MoreVertical,
  LogOut,
  RefreshCcw,
  MapPin,
  Users,
  Link,
  Filter,
  Settings,
  User,
  Building,
  Target,
  Bell,
  Repeat,
  Palette
} from 'lucide-react';
import CRMEventSelector from '@/Components/Calendar/CRMEventSelector';

import { format, isValid, parseISO } from 'date-fns';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import momentPlugin from '@fullcalendar/moment';
import momentTimezonePlugin from '@fullcalendar/moment-timezone';

// Shadcn UI components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/Components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuCheckboxItem } from '@/Components/ui/dropdown-menu';
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

// Enhanced interface for FullCalendar events
export interface EnhancedFullCalendarEvent {
    id: string;
    title: string;
    start: string | Date;
    end: string | Date;
    allDay?: boolean;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    extendedProps?: {
        description?: string;
        type?: string;
        priority?: string;
        location?: string;
        attendees?: string[];
        meeting_link?: string;
        contact?: any;
        company?: any;
        opportunity?: any;
        originalEvent: GoogleCalendarEvent | LocalCalendarEvent;
    };
}

// Helper to format datetimes for HTML datetime-local input
const formatDatetimeLocal = (date: Date): string => {
    if (!isValid(date)) {
        const now = new Date();
        return format(now, "yyyy-MM-dd'T'HH:mm");
    }
    return format(date, "yyyy-MM-dd'T'HH:mm");
};

// Map local events to FullCalendar format with enhanced styling
const mapLocalEventsToFullCalendar = (localEvents: LocalCalendarEvent[]): EnhancedFullCalendarEvent[] => {
    if (!Array.isArray(localEvents)) {
        return [];
    }

    return localEvents.map(event => {
        const baseColor = event.color || '#3b82f6';

        return {
            id: event.id.toString(),
            title: event.title || 'Événement',
            start: event.start_datetime,
            end: event.end_datetime,
            allDay: event.all_day,
            backgroundColor: baseColor,
            borderColor: baseColor,
            textColor: '#ffffff',
            extendedProps: {
                description: event.description,
                type: event.type,
                priority: event.priority,
                location: event.location,
                attendees: event.attendees,
                meeting_link: event.meeting_link,
                contact: event.contact,
                company: event.company,
                opportunity: event.opportunity,
                originalEvent: event,
            },
        };
    });
};

// Enhanced map for Google events with type detection
const mapGoogleEventsToFullCalendar = (googleEvents: GoogleCalendarEvent[]): EnhancedFullCalendarEvent[] => {
    if (!Array.isArray(googleEvents)) return [];

    return googleEvents.map(event => {
        let start: string | Date;
        let end: string | Date;
        let allDay = false;

        if (event.start?.dateTime) {
            start = event.start.dateTime;
            end = event.end?.dateTime || event.start.dateTime;
            allDay = false;
        } else if (event.start?.date) {
            start = event.start.date;
            const googleEndDate = event.end?.date;
            if (googleEndDate) {
                end = googleEndDate;
            } else {
                const tempEndDate = new Date(event.start.date);
                tempEndDate.setDate(tempEndDate.getDate() + 1);
                end = tempEndDate.toISOString().split('T')[0];
            }
            allDay = true;
        } else {
            start = new Date().toISOString();
            end = new Date().toISOString();
            allDay = false;
        }

        // Auto-detect event type based on title/description
        let detectedType = 'meeting';
        const title = (event.summary || '').toLowerCase();
        if (title.includes('call') || title.includes('appel')) detectedType = 'call';
        else if (title.includes('deadline') || title.includes('échéance')) detectedType = 'deadline';
        else if (title.includes('task') || title.includes('tâche')) detectedType = 'task';

        const typeColors = {
            'meeting': '#3b82f6',
            'call': '#10b981',
            'deadline': '#ef4444',
            'task': '#f59e0b',
            'other': '#6b7280'
        };

        return {
            id: event.id,
            title: event.summary || 'Événement Google',
            start: start,
            end: end,
            allDay: allDay,
            backgroundColor: typeColors[detectedType as keyof typeof typeColors] || '#3b82f6',
            borderColor: typeColors[detectedType as keyof typeof typeColors] || '#3b82f6',
            textColor: '#ffffff',
            extendedProps: {
                description: event.description,
                type: detectedType,
                location: event.location,
                meeting_link: event.hangoutLink,
                originalEvent: event,
            },
        };
    });
};

const EnhancedCalendarPage: React.FC<PageProps> = ({ auth }) => {
    // State for filters and UI
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
    const [showCRMEvents, setShowCRMEvents] = useState(true);
    const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());
    const [eventTypes, setEventTypes] = useState<EventTypes>({});
    const [priorityLevels, setPriorityLevels] = useState<PriorityLevels>({});

    // Enhanced form state
    const initialCreateFormState = (): LocalEventPayload => {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 3600 * 1000);
        return {
            title: '',
            description: '',
            start_datetime: formatDatetimeLocal(now),
            end_datetime: formatDatetimeLocal(oneHourLater),
            type: 'meeting',
            priority: 'medium',
            all_day: false,
            location: '',
            attendees: [],
            notes: '',
            meeting_link: '',
        };
    };

    // Existing hooks
    const { data: authUrlResponse, isLoading: authUrlLoading, isError: authUrlError } = useGetGoogleAuthUrlQuery();
    const {
        data: googleEvents,
        isLoading: isGoogleEventsLoading,
        isError: isGoogleEventsError,
        isSuccess: isGoogleEventsSuccess,
        refetch: refetchGoogleEvents,
    } = useGetGoogleCalendarEventsQuery();

    const {
        data: localEvents,
        isLoading: isLocalEventsLoading,
        isError: isLocalEventsError,
        isSuccess: isLocalEventsSuccess,
        refetch: refetchLocalEvents,
    } = useGetLocalCalendarEventsQuery();

    const [createGoogleEvent, { isLoading: isCreatingGoogleEvent }] = useCreateGoogleCalendarEventMutation();
    const [updateGoogleEvent, { isLoading: isUpdatingGoogleEvent }] = useUpdateGoogleCalendarEventMutation();
    const [deleteGoogleEvent, { isLoading: isDeletingGoogleEvent }] = useDeleteGoogleCalendarEventMutation();
    const [logoutGoogleCalendar] = useLogoutGoogleCalendarMutation();

    const [createLocalEvent, { isLoading: isCreatingLocalEvent }] = useCreateLocalCalendarEventMutation();
    const [updateLocalEvent, { isLoading: isUpdatingLocalEvent }] = useUpdateLocalCalendarEventMutation();
    const [deleteLocalEvent, { isLoading: isDeletingLocalEvent }] = useDeleteLocalCalendarEventMutation();

    // State management
    const [createForm, setCreateForm] = useState<LocalEventPayload>(initialCreateFormState);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<GoogleCalendarEvent | LocalCalendarEvent | null>(null);
    const [isEditingEvent, setIsEditingEvent] = useState(false);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);

    const calendarRef = useRef<FullCalendar>(null);
    const isGoogleConnected = isGoogleEventsSuccess;

    // Load event types and priorities on mount
    useEffect(() => {
        const loadEventConfig = async () => {
            try {
                const [typesRes, prioritiesRes] = await Promise.all([
                    fetch('/api/local-calendar-events/types'),
                    fetch('/api/local-calendar-events/priorities')
                ]);

                if (typesRes.ok) {
                    const types = await typesRes.json();
                    setEventTypes(types);
                    setSelectedTypes(Object.keys(types));
                }

                if (prioritiesRes.ok) {
                    const priorities = await prioritiesRes.json();
                    setPriorityLevels(priorities);
                    setSelectedPriorities(Object.keys(priorities));
                }
            } catch (error) {
                console.error('Failed to load event configuration:', error);
            }
        };

        loadEventConfig();
    }, []);

    // Filter events based on selected filters
    // Google Calendar logout handler
    const handleGoogleLogout = async () => {
        try {
            await logoutGoogleCalendar().unwrap();
            toast.success('Déconnexion de Google Calendar réussie');
            window.location.reload(); // Refresh to update connection status
        } catch (error) {
            toast.error('Erreur lors de la déconnexion');
        }
    };

    // Google Calendar connection handler
    const handleGoogleConnect = useCallback(() => {
        if (authUrlResponse?.auth_url) {
            window.location.href = authUrlResponse.auth_url;
        } else {
            toast.error("URL d'authentification Google non disponible. Veuillez réessayer.");
        }
    }, [authUrlResponse]);

    const filterEvents = useCallback((events: EnhancedFullCalendarEvent[]) => {
        return events.filter(event => {
            const eventType = event.extendedProps?.type || 'other';
            const eventPriority = event.extendedProps?.priority || 'medium';
            const hasContact = event.extendedProps?.contact;
            const hasCompany = event.extendedProps?.company;
            const hasOpportunity = event.extendedProps?.opportunity;

            // Type filter
            if (selectedTypes.length > 0 && !selectedTypes.includes(eventType)) {
                return false;
            }

            // Priority filter
            if (selectedPriorities.length > 0 && !selectedPriorities.includes(eventPriority)) {
                return false;
            }

            // CRM filter
            if (!showCRMEvents && (hasContact || hasCompany || hasOpportunity)) {
                return false;
            }

            return true;
        });
    }, [selectedTypes, selectedPriorities, showCRMEvents]);

    // Get filtered events for display
    const eventsToDisplay: EnhancedFullCalendarEvent[] = React.useMemo(() => {
        let allEvents: EnhancedFullCalendarEvent[] = [];

        if (isGoogleConnected) {
            allEvents = mapGoogleEventsToFullCalendar(googleEvents || []);
        } else {
            allEvents = mapLocalEventsToFullCalendar(localEvents || []);
        }

        return filterEvents(allEvents);
    }, [isGoogleConnected, googleEvents, localEvents, filterEvents]);

    // Enhanced event click handler
    const handleEventClick = (clickInfo: any) => {
        const event = clickInfo.event.extendedProps.originalEvent;
        if (!event) return;

        setSelectedEvent(event);
        setIsDetailModalOpen(true);
    };

    // Handle creating enhanced events
    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!createForm.title.trim()) {
            toast.error("Le titre de l'événement est obligatoire.");
            return;
        }

        if (new Date(createForm.start_datetime).getTime() >= new Date(createForm.end_datetime).getTime()) {
            toast.error("La date de fin doit être postérieure à la date de début.");
            return;
        }

        try {
            if (isGoogleConnected) {
                // Convert to Google Calendar format
                const googlePayload: CreateCalendarEventPayload = {
                    summary: createForm.title,
                    description: createForm.description || '',
                    start_datetime: createForm.start_datetime,
                    end_datetime: createForm.end_datetime,
                    location: createForm.location,
                    attendees: createForm.attendees || [],
                };

                await createGoogleEvent(googlePayload).unwrap();
                toast.success('Événement créé avec succès sur Google Calendar !');
                refetchGoogleEvents();
            } else {
                await createLocalEvent(createForm).unwrap();
                toast.success('Événement local créé avec succès !');
                refetchLocalEvents();
            }

            setCreateForm(initialCreateFormState());
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Error creating event:', error);
            toast.error('Erreur lors de la création de l\'événement');
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Calendrier Amélioré</h2>}
        >
            <Head title="Calendrier" />

            <div className="py-6 h-full flex flex-col">
                <div className="flex-grow h-full">
                    <div className="bg-white overflow-hidden sm:rounded-lg px-6 h-full flex flex-col space-y-6">

                        {/* Enhanced Header with Filters */}
                        <Card className="flex-shrink-0 shadow-none border-0">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
                                <div>
                                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                        <CalendarIcon className="h-6 w-6" />
                                        Calendrier Amélioré
                                    </CardTitle>
                                    <CardDescription className="mt-2">
                                        {isGoogleConnected
                                            ? "Synchronisé avec Google Calendar • Fonctionnalités CRM intégrées"
                                            : "Calendrier local avec intégration CRM"}
                                    </CardDescription>
                                </div>

                                <div className="flex gap-2 items-center">
                                    {/* Filters Dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Filter className="h-4 w-4 mr-2" />
                                                Filtres
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-64">
                                            <DropdownMenuLabel>Types d'événements</DropdownMenuLabel>
                                            {Object.entries(eventTypes).map(([key, type]) => (
                                                <DropdownMenuCheckboxItem
                                                    key={key}
                                                    checked={selectedTypes.includes(key)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedTypes([...selectedTypes, key]);
                                                        } else {
                                                            setSelectedTypes(selectedTypes.filter(t => t !== key));
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded"
                                                            style={{ backgroundColor: type.color }}
                                                        />
                                                        {type.label}
                                                    </div>
                                                </DropdownMenuCheckboxItem>
                                            ))}

                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>Priorités</DropdownMenuLabel>
                                            {Object.entries(priorityLevels).map(([key, priority]) => (
                                                <DropdownMenuCheckboxItem
                                                    key={key}
                                                    checked={selectedPriorities.includes(key)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedPriorities([...selectedPriorities, key]);
                                                        } else {
                                                            setSelectedPriorities(selectedPriorities.filter(p => p !== key));
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded"
                                                            style={{ backgroundColor: priority.color }}
                                                        />
                                                        {priority.label}
                                                    </div>
                                                </DropdownMenuCheckboxItem>
                                            ))}

                                            <DropdownMenuSeparator />
                                            <DropdownMenuCheckboxItem
                                                checked={showCRMEvents}
                                                onCheckedChange={setShowCRMEvents}
                                            >
                                                <Target className="mr-2 h-4 w-4" />
                                                Événements CRM
                                            </DropdownMenuCheckboxItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Refresh Button */}
                                    <Button
                                        onClick={isGoogleConnected ? refetchGoogleEvents : refetchLocalEvents}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                    </Button>

                                    {/* Create Event Button */}
                                    <Button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="bg-teal-600 hover:bg-teal-700"
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Nouvel événement
                                    </Button>

                                    {/* Google Calendar Connection */}
                                    {isGoogleConnected ? (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="flex items-center">
                                                    <img src="https://www.google.com/favicon.ico" alt="Google Icon" className="h-4 w-4 mr-2" />
                                                    Connecté
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Google Calendar</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={handleGoogleLogout}>
                                                    <LogOut className="mr-2 h-4 w-4" />
                                                    Se déconnecter
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ) : (
                                        <Button variant="outline" onClick={handleGoogleConnect}>
                                            <img src="https://www.google.com/favicon.ico" alt="Google Icon" className="h-4 w-4 mr-2" />
                                            Se connecter à Google
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent>
                                {/* Event Type Legend */}
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                    <div className="flex flex-wrap gap-4">
                                        {Object.entries(eventTypes).map(([key, type]) => (
                                            <div key={key} className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded"
                                                    style={{ backgroundColor: type.color }}
                                                />
                                                <span className="text-sm text-gray-600">{type.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Calendar Container */}
                                <div className="full-calendar-container relative" style={{ height: '600px', width: '100%' }}>
                                    <FullCalendar
                                        ref={calendarRef}
                                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, momentPlugin, momentTimezonePlugin]}
                                        initialView="dayGridMonth"
                                        headerToolbar={{
                                            left: 'prev,next today',
                                            center: 'title',
                                            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                                        }}
                                        events={eventsToDisplay}
                                        eventClick={handleEventClick}
                                        editable={true}
                                        locale="fr"
                                        height="100%"
                                        eventDisplay="block"
                                    />

                                    {(isLocalEventsLoading || isGoogleEventsLoading) && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                                            <div className="flex items-center text-gray-600">
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Chargement des événements...
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Enhanced Create Event Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PlusCircle className="h-5 w-5 text-teal-600" />
                            Créer un Nouvel Événement
                        </DialogTitle>
                        <DialogDescription>
                            {isGoogleConnected ? 'Ajout à Google Calendar' : 'Événement local avec intégration CRM'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateEvent} className="space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label htmlFor="title">Titre *</Label>
                                <Input
                                    id="title"
                                    value={createForm.title}
                                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                                    placeholder="Ex: Réunion avec client"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="type">Type d'événement</Label>
                                <Select
                                    value={createForm.type}
                                    onValueChange={(value) => setCreateForm({ ...createForm, type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(eventTypes).map(([key, type]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded"
                                                        style={{ backgroundColor: type.color }}
                                                    />
                                                    {type.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="priority">Priorité</Label>
                                <Select
                                    value={createForm.priority}
                                    onValueChange={(value) => setCreateForm({ ...createForm, priority: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(priorityLevels).map(([key, priority]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded"
                                                        style={{ backgroundColor: priority.color }}
                                                    />
                                                    {priority.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="start_datetime">Début *</Label>
                                <Input
                                    id="start_datetime"
                                    type="datetime-local"
                                    value={createForm.start_datetime}
                                    onChange={(e) => setCreateForm({ ...createForm, start_datetime: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="end_datetime">Fin *</Label>
                                <Input
                                    id="end_datetime"
                                    type="datetime-local"
                                    value={createForm.end_datetime}
                                    onChange={(e) => setCreateForm({ ...createForm, end_datetime: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* All Day Option */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="all_day"
                                checked={createForm.all_day}
                                onCheckedChange={(checked) => setCreateForm({ ...createForm, all_day: checked as boolean })}
                            />
                            <Label htmlFor="all_day">Toute la journée</Label>
                        </div>

                        {/* Location & Meeting Link */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="location">Lieu</Label>
                                <Input
                                    id="location"
                                    value={createForm.location || ''}
                                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                                    placeholder="Bureau, Adresse, Visio..."
                                />
                            </div>
                            <div>
                                <Label htmlFor="meeting_link">Lien de réunion</Label>
                                <Input
                                    id="meeting_link"
                                    type="url"
                                    value={createForm.meeting_link || ''}
                                    onChange={(e) => setCreateForm({ ...createForm, meeting_link: e.target.value })}
                                    placeholder="https://zoom.us/..."
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={createForm.description || ''}
                                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                placeholder="Détails de l'événement..."
                                rows={3}
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <Label htmlFor="notes">Notes internes</Label>
                            <Textarea
                                id="notes"
                                value={createForm.notes || ''}
                                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                                placeholder="Notes privées..."
                                rows={2}
                            />
                        </div>

                        {/* CRM Integration - Only for local events */}
                        {!isGoogleConnected && (
                            <div className="pt-4">
                                <CRMEventSelector
                                    selectedContactId={createForm.contact_id}
                                    selectedCompanyId={createForm.company_id}
                                    selectedOpportunityId={createForm.opportunity_id}
                                    selectedReminderId={createForm.reminder_id}
                                    onContactChange={(contactId) => setCreateForm({ ...createForm, contact_id: contactId })}
                                    onCompanyChange={(companyId) => setCreateForm({ ...createForm, company_id: companyId })}
                                    onOpportunityChange={(opportunityId) => setCreateForm({ ...createForm, opportunity_id: opportunityId })}
                                    onReminderChange={(reminderId) => setCreateForm({ ...createForm, reminder_id: reminderId })}
                                />
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateModalOpen(false)}
                                type="button"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="bg-teal-600 hover:bg-teal-700"
                                disabled={isCreatingGoogleEvent || isCreatingLocalEvent}
                            >
                                {(isCreatingGoogleEvent || isCreatingLocalEvent) ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Création...
                                    </>
                                ) : (
                                    'Créer l\'événement'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Event Details Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-teal-600" />
                            Détails de l'événement
                        </DialogTitle>
                    </DialogHeader>

                    {selectedEvent && (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <h3 className="text-xl font-semibold">{selectedEvent.title || selectedEvent.summary}</h3>
                                    {selectedEvent.description && (
                                        <p className="text-gray-600 mt-2">{selectedEvent.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="font-medium">Date de début</Label>
                                    <p className="text-sm text-gray-600">
                                        {selectedEvent.start_time || selectedEvent.start?.dateTime 
                                            ? new Date(selectedEvent.start_time || selectedEvent.start.dateTime).toLocaleString('fr-FR')
                                            : 'Non spécifiée'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="font-medium">Date de fin</Label>
                                    <p className="text-sm text-gray-600">
                                        {selectedEvent.end_time || selectedEvent.end?.dateTime 
                                            ? new Date(selectedEvent.end_time || selectedEvent.end.dateTime).toLocaleString('fr-FR')
                                            : 'Non spécifiée'}
                                    </p>
                                </div>
                            </div>

                            {/* Event Details for Local Events */}
                            {'type' in selectedEvent && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedEvent.type && (
                                            <div>
                                                <Label className="font-medium">Type</Label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span 
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: eventTypes[selectedEvent.type]?.color || '#gray' }}
                                                    ></span>
                                                    <span className="text-sm">{eventTypes[selectedEvent.type]?.label || selectedEvent.type}</span>
                                                </div>
                                            </div>
                                        )}
                                        {selectedEvent.priority && (
                                            <div>
                                                <Label className="font-medium">Priorité</Label>
                                                <Badge 
                                                    variant="outline" 
                                                    className="mt-1"
                                                    style={{ 
                                                        backgroundColor: priorityLevels[selectedEvent.priority]?.color + '20',
                                                        borderColor: priorityLevels[selectedEvent.priority]?.color,
                                                        color: priorityLevels[selectedEvent.priority]?.color
                                                    }}
                                                >
                                                    {priorityLevels[selectedEvent.priority]?.label || selectedEvent.priority}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Location */}
                            {(selectedEvent.location || ('location' in selectedEvent && selectedEvent.location)) && (
                                <div>
                                    <Label className="font-medium">Lieu</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            {selectedEvent.location || ('location' in selectedEvent ? selectedEvent.location : '')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* CRM Integration */}
                            {'contact_id' in selectedEvent && (selectedEvent.contact || selectedEvent.company || selectedEvent.opportunity) && (
                                <div>
                                    <Label className="font-medium">Données CRM</Label>
                                    <div className="space-y-2 mt-2">
                                        {selectedEvent.contact && (
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm">Contact: {selectedEvent.contact.name}</span>
                                            </div>
                                        )}
                                        {selectedEvent.company && (
                                            <div className="flex items-center gap-2">
                                                <Building className="h-4 w-4 text-green-500" />
                                                <span className="text-sm">Entreprise: {selectedEvent.company.name}</span>
                                            </div>
                                        )}
                                        {selectedEvent.opportunity && (
                                            <div className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-purple-500" />
                                                <span className="text-sm">Opportunité: {selectedEvent.opportunity.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Meeting Link */}
                            {'meeting_link' in selectedEvent && selectedEvent.meeting_link && (
                                <div>
                                    <Label className="font-medium">Lien de réunion</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Video className="h-4 w-4 text-blue-500" />
                                        <a 
                                            href={selectedEvent.meeting_link} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                            Rejoindre la réunion
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {'notes' in selectedEvent && selectedEvent.notes && (
                                <div>
                                    <Label className="font-medium">Notes</Label>
                                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{selectedEvent.notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                            Fermer
                        </Button>
                        {/* Add Edit/Delete buttons here if needed */}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
};

export default EnhancedCalendarPage;
