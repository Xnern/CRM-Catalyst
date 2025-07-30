// resources/js/Pages/Calendar/CalendarPage.tsx

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    useGetGoogleAuthUrlQuery,
    useGetGoogleCalendarEventsQuery,
    useCreateGoogleCalendarEventMutation,
    // Assurez-vous d'avoir une mutation pour l'update si vous voulez sauvegarder le drag-and-drop
    // useUpdateGoogleCalendarEventMutation, // <--- NOUVEAU
    GoogleCalendarEvent,
    CreateCalendarEventPayload,
    GoogleAuthUrlResponse
} from '@/services/api';

import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { format, isValid } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Link, BookOpen, Edit, Trash } from 'lucide-react'; // Nouvelles icônes

// FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'; // For drag & drop
import listPlugin from '@fullcalendar/list'; // For list view
import momentPlugin from '@fullcalendar/moment'; // To use moment for parsing dates
import momentTimezonePlugin from '@fullcalendar/moment-timezone'; // For timezone support

// Shadcn UI components for dialog/dropdown
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/Components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu';


// Helper to format datetimes for HTML datetime-local input
const formatDatetimeLocal = (date: Date): string => {
    if (!isValid(date)) {
        return '';
    }
    return format(date, "yyyy-MM-dd'T'HH:mm");
};

// Interface pour les événements FullCalendar
export interface FullCalendarEvent {
    id: string;
    title: string;
    start: string | Date;
    end: string | Date;
    allDay?: boolean;
    extendedProps?: {
        description?: string;
        htmlLink?: string;
        hangoutLink?: string;
        // ... any other Google event properties you want to keep
    };
}

// Mapper les événements Google Calendar vers le format FullCalendar
const mapGoogleEventsToFullCalendar = (googleEvents: GoogleCalendarEvent[]): FullCalendarEvent[] => {
    if (!googleEvents) return [];
    return googleEvents.map(event => {
        let start: string | Date;
        let end: string | Date;
        let allDay = false;

        // Ensure start.date and end.date are present for all-day events
        // and adjust 'end' for FullCalendar's all-day representation
        if (event.start?.dateTime) {
            start = event.start.dateTime;
            end = event.end?.dateTime || event.start.dateTime;
            allDay = false;
        } else if (event.start?.date) {
            start = event.start.date;
            // FullCalendar's all-day events: 'end' is exclusive.
            // If Google says '2025-07-16' to '2025-07-17' (meaning it ends *on* the 16th),
            // FullCalendar needs '2025-07-17' as the end date for a single-day all-day event.
            const googleEndDate = event.end?.date;
            if (googleEndDate) {
                const tempEndDate = new Date(googleEndDate);
                // If it's truly an all-day event for one day (start=2025-07-16, end=2025-07-17 in Google),
                // FullCalendar expects end to be the day *after* the last day.
                // Google's all-day `end` is already exclusive, so we can often use it directly.
                // However, for single day events, Google gives end as (start date + 1 day).
                // So if start is 2025-07-16 and end is 2025-07-17, it's a one-day event on the 16th.
                end = googleEndDate; // FullCalendar will handle this correctly for allDay=true
            } else {
                // Fallback if end.date is missing for an all-day event
                const tempEndDate = new Date(event.start.date);
                tempEndDate.setDate(tempEndDate.getDate() + 1);
                end = tempEndDate.toISOString().split('T')[0];
            }
            allDay = true;
        } else {
            // Fallback for malformed event dates
            start = new Date().toISOString();
            end = new Date().toISOString();
            allDay = false;
        }

        return {
            id: event.id,
            title: event.summary || 'Événement sans titre',
            start: start,
            end: end,
            allDay: allDay,
            extendedProps: {
                description: event.description,
                htmlLink: event.htmlLink,
                hangoutLink: event.hangoutLink,
                status: event.status, // Keep status for potential styling
                originalGoogleEvent: event, // Keep original Google event for full details
            },
        };
    });
};

const CalendarPage: React.FC<PageProps> = ({ auth }) => {
    const { data: authUrlResponse, isLoading: authUrlLoading, isError: authUrlError } = useGetGoogleAuthUrlQuery();
    const {
        data: events,
        isLoading: eventsLoading,
        error: eventsError,
        refetch,
    } = useGetGoogleCalendarEventsQuery();

    const [createEvent, { isLoading: isCreatingEvent }] = useCreateGoogleCalendarEventMutation();
    // const [updateEvent, { isLoading: isUpdatingEvent }] = useUpdateGoogleCalendarEventMutation(); // <--- NOUVEAU

    const [newEvent, setNewEvent] = useState<CreateCalendarEventPayload>(() => {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 3600 * 1000);
        return {
            summary: '',
            description: '',
            start_datetime: formatDatetimeLocal(now),
            end_datetime: formatDatetimeLocal(oneHourLater),
            attendees: [],
        };
    });

    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<GoogleCalendarEvent | null>(null); // Store GoogleCalendarEvent directly for full details

    // --- CORRECTION: FullCalendar Ref et Resize Observer ---
    // Crée une référence pour accéder à l'instance FullCalendar.
    const calendarRef = useRef<FullCalendar>(null);

    // Fonction de rappel qui sera appelée lors du redimensionnement du conteneur.
    // Elle appelle la méthode updateSize() de l'API FullCalendar.
    const handleCalendarResize = useCallback(() => {
        if (calendarRef.current) {
            // C'est ici que calendar.updateSize() est appelé, via l'API du composant React FullCalendar.
            calendarRef.current.getApi().updateSize();
        }
    }, []);

    useEffect(() => {
        // Sélectionne le conteneur du calendrier pour l'observer.
        // Assurez-vous que cette classe CSS (.full-calendar-container) est appliquée au div parent de FullCalendar.
        const calendarContainer = document.querySelector('.full-calendar-container');

        if (calendarContainer) {
            // Initialise un ResizeObserver pour détecter les changements de taille du conteneur.
            const resizeObserver = new ResizeObserver(() => {
                handleCalendarResize(); // Appelle la fonction de redimensionnement du calendrier
            });

            // Commence à observer le conteneur.
            resizeObserver.observe(calendarContainer);

            // Fonction de nettoyage pour arrêter d'observer quand le composant est démonté.
            return () => {
                resizeObserver.unobserve(calendarContainer);
            };
        }
    }, [handleCalendarResize]); // Le useEffect dépend de handleCalendarResize pour garantir qu'il est mis à jour si la dépendance change.
    // --- FIN DE LA CORRECTION ---

    // Handle Google auth callback redirection
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const googleAuthStatus = urlParams.get('google_auth');

        if (googleAuthStatus === 'success') {
            toast.success('Connexion Google Calendar réussie ! Vos événements sont en cours de chargement.');
            refetch();
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        } else if (googleAuthStatus === 'failed' || googleAuthStatus === 'error') {
            toast.error('Échec de la connexion à Google Calendar. Veuillez réessayer.');
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }
    }, [refetch]);

    const handleAuthRedirect = useCallback(() => {
        if (authUrlResponse?.auth_url) {
            window.location.href = authUrlResponse.auth_url;
        } else if (authUrlError) {
            toast.error("Impossible de récupérer l'URL d'authentification. Veuillez réessayer.");
        } else {
            toast.error("URL d'authentification non disponible ou au format inattendu.");
            console.error("Unexpected authUrlResponse format:", authUrlResponse);
        }
    }, [authUrlResponse, authUrlError]);

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEvent.summary.trim()) {
            toast.error("Le titre de l'événement est obligatoire.");
            return;
        }
        if (new Date(newEvent.start_datetime).getTime() >= new Date(newEvent.end_datetime).getTime()) {
            toast.error("La date de fin doit être postérieure à la date de début.");
            return;
        }

        try {
            await createEvent(newEvent).unwrap();
            toast.success('Événement créé avec succès sur Google Calendar !');
            const now = new Date();
            const oneHourLater = new Date(now.getTime() + 3600 * 1000);
            setNewEvent({
                summary: '',
                description: '',
                start_datetime: formatDatetimeLocal(now),
                end_datetime: formatDatetimeLocal(oneHourLater),
                attendees: [],
            });
            refetch();
        } catch (error) {
            console.error('Erreur lors de la création de l\'événement Google Calendar :', error);
            const errorMessage = (error as any)?.data?.message || (error as any)?.message || 'Une erreur inconnue est survenue.';
            toast.error(`Échec de la création de l\'événement: ${errorMessage}`);
        }
    };

    const handleEventClick = (clickInfo: any) => {
        // clickInfo.event est l'objet FullCalendarEvent
        // Nous stockons l'événement Google original, qui est dans extendedProps.originalGoogleEvent
        setSelectedEvent(clickInfo.event.extendedProps.originalGoogleEvent as GoogleCalendarEvent);
        setIsEventModalOpen(true);
    };

    // Gérer le déplacement d'un événement (drag-and-drop)
    const handleEventDrop = async (dropInfo: any) => {
        // dropInfo.event est l'événement FullCalendar après le déplacement
        const eventId = dropInfo.event.id;
        const newStart = dropInfo.event.startStr; // Nouvelle date de début
        const newEnd = dropInfo.event.endStr;     // Nouvelle date de fin

        console.log(`Event ${eventId} dropped to new start: ${newStart}, new end: ${newEnd}`);

        // TODO: Appeler votre mutation d'update ici pour sauvegarder les changements
        // Exemple (nécessite une nouvelle mutation dans api.ts et un endpoint Laravel) :
        /*
        try {
            await updateEvent({
                id: eventId,
                start_datetime: newStart.slice(0, 19), // Remove timezone info if needed by backend
                end_datetime: newEnd.slice(0, 19)
            }).unwrap();
            toast.success('Événement déplacé avec succès !');
            refetch(); // Recharger pour synchroniser
        } catch (error) {
            console.error('Erreur lors du déplacement de l\'événement :', error);
            toast.error('Échec du déplacement de l\'événement.');
            dropInfo.revert(); // Revenir à la position précédente si échec
        }
        */
       toast.info("Déplacement d'événement non sauvegardé (fonctionnalité en attente)");
       // Pour l'instant, on n'a pas de backend pour sauvegarder le drag-and-drop,
       // donc l'événement reviendra à sa position initiale au rechargement.
    };

    const handleEventResize = async (resizeInfo: any) => {
        // resizeInfo.event est l'événement FullCalendar après le redimensionnement
        const eventId = resizeInfo.event.id;
        const newStart = resizeInfo.event.startStr;
        const newEnd = resizeInfo.event.endStr;

        console.log(`Event ${eventId} resized to new start: ${newStart}, new end: ${newEnd}`);

        // TODO: Appeler votre mutation d'update ici
        /*
        try {
            await updateEvent({
                id: eventId,
                start_datetime: newStart.slice(0, 19),
                end_datetime: newEnd.slice(0, 19)
            }).unwrap();
            toast.success('Événement redimensionné avec succès !');
            refetch();
        } catch (error) {
            console.error('Erreur lors du redimensionnement de l\'événement :', error);
            toast.error('Échec du redimensionnement de l\'événement.');
            resizeInfo.revert();
        }
        */
       toast.info("Redimensionnement d'événement non sauvegardé (fonctionnalité en attente)");
    };

    // TODO: Implémenter la logique de modification/suppression ici
    const handleEditEvent = () => {
        toast.info("Fonctionnalité d'édition à implémenter.");
        // Ici vous ouvririez un formulaire pré-rempli avec selectedEvent
        setIsEventModalOpen(false); // Close modal after action
    };

    const handleDeleteEvent = () => {
        toast.info("Fonctionnalité de suppression à implémenter.");
        // Ici vous enverriez une requête de suppression au backend
        setIsEventModalOpen(false); // Close modal after action
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Calendrier Google</h2>}
        >
            <Head title="Calendrier" />

            <div className="py-6 h-full flex flex-col">
                <div className="flex-grow h-full">
                    <div className="bg-white overflow-hidden sm:rounded-lg px-6 h-full flex flex-col space-y-6">
                        <Card className="flex-shrink-0 shadow-none border-0">
                            <CardHeader>
                                <CardTitle>Intégration Google Calendar</CardTitle>
                                <CardDescription>Gérez vos rendez-vous directement depuis votre CRM.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!events ? (
                                    <div className="flex flex-col items-start space-y-4">
                                        <p className="text-gray-600">
                                            Connectez votre compte Google pour synchroniser et créer des événements.
                                        </p>
                                        {authUrlLoading ? (
                                            <Button disabled>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Chargement du lien...
                                            </Button>
                                        ) : authUrlError ? (
                                            <p className="text-red-500">Erreur: Impossible de charger l'URL de connexion. Vérifiez votre configuration backend.</p>
                                        ) : (
                                            <Button onClick={handleAuthRedirect} className="bg-blue-600 hover:bg-blue-700 text-white">
                                                Connecter Google Calendar
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <h2 className="text-xl font-semibold mb-4 text-gray-800">Vos Événements Google Calendar</h2>
                                        {eventsLoading ? (
                                            <div className="flex items-center text-gray-600">
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Chargement des événements...
                                            </div>
                                        ) : eventsError ? (
                                            <p className="text-red-500">Erreur lors du chargement des événements : {(eventsError as any)?.data?.message || (eventsError as any)?.message || 'Une erreur inconnue est survenue.'}</p>
                                        ) : (
                                            // FullCalendar Integration
                                            <div className="full-calendar-container" style={{ height: '100%', width: '100%' }}>
                                                <FullCalendar
                                                    ref={calendarRef}
                                                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, momentPlugin, momentTimezonePlugin]}
                                                    initialView="dayGridMonth" // Vue par défaut: mois
                                                    headerToolbar={{
                                                        left: 'prev,next today',
                                                        center: 'title',
                                                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' // Options de vue
                                                    }}
                                                    events={mapGoogleEventsToFullCalendar(events)} // Vos événements mappés
                                                    eventClick={handleEventClick} // Gérer le clic sur l'événement
                                                    editable={true} // Permettre le glisser-déposer et le redimensionnement
                                                    selectable={true} // Permettre la sélection de plages de dates
                                                    eventDrop={handleEventDrop} // Gérer l'événement déplacé
                                                    eventResize={handleEventResize} // Gérer le redimensionnement
                                                    locale="fr" // Langue française
                                                    // Timezone pour les événements si nécessaire (e.g., 'Europe/Paris')
                                                    // timeZone="Europe/Paris"
                                                    // eventDataTransform: (eventData: any) => { /* ... */ }, // Pour une transformation plus avancée
                                                    // dateClick={(info) => alert('clicked ' + info.dateStr)} // Gérer le clic sur une date vide
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Separator />

                        {/* Create New Event Section (remains mostly the same) */}
                        <Card className="flex-shrink-0">
                            <CardHeader>
                                <CardTitle>Créer un Nouvel Événement Google Calendar</CardTitle>
                                <CardDescription>Planifiez rapidement des événements qui apparaîtront dans votre Google Agenda.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="summary">Titre de l'événement <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="summary"
                                            value={newEvent.summary}
                                            onChange={(e) => setNewEvent({ ...newEvent, summary: e.target.value })}
                                            placeholder="Ex: Réunion avec client X"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            value={newEvent.description || ''}
                                            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                            placeholder="Détails de l'événement..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="start_datetime">Début <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="start_datetime"
                                            type="datetime-local"
                                            value={newEvent.start_datetime}
                                            onChange={(e) => setNewEvent({ ...newEvent, start_datetime: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="end_datetime">Fin <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="end_datetime"
                                            type="datetime-local"
                                            value={newEvent.end_datetime}
                                            onChange={(e) => setNewEvent({ ...newEvent, end_datetime: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-full">
                                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isCreatingEvent}>
                                            {isCreatingEvent ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Création en cours...
                                                </>
                                            ) : (
                                                'Créer l\'événement'
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Event Details/Modification Modal (Shadcn Dialog) */}
            <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedEvent?.summary || 'Détails de l\'événement'}</DialogTitle>
                        <DialogDescription>
                            Informations et options pour cet événement.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedEvent && (
                        <div className="space-y-4 py-4">
                            <p className="text-gray-700">
                                <span className="font-semibold">Début :</span> {selectedEvent.start?.dateTime ? format(new Date(selectedEvent.start.dateTime), 'dd/MM/yyyy HH:mm') : selectedEvent.start?.date ? format(new Date(selectedEvent.start.date), 'dd/MM/yyyy') : 'N/A'}
                            </p>
                            <p className="text-gray-700">
                                <span className="font-semibold">Fin :</span> {selectedEvent.end?.dateTime ? format(new Date(selectedEvent.end.dateTime), 'dd/MM/yyyy HH:mm') : selectedEvent.end?.date ? format(new Date(selectedEvent.end.date), 'dd/MM/yyyy') : 'N/A'}
                            </p>
                            {selectedEvent.description && (
                                <p className="text-gray-600">
                                    <span className="font-semibold">Description :</span> {selectedEvent.description}
                                </p>
                            )}
                            {selectedEvent.htmlLink && (
                                <a href={selectedEvent.htmlLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center">
                                    <Link className="mr-2 h-4 w-4" /> Voir sur Google Calendar
                                </a>
                            )}
                            {selectedEvent.hangoutLink && (
                                <a href={selectedEvent.hangoutLink} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline flex items-center">
                                    <Link className="mr-2 h-4 w-4" /> Rejoindre la réunion (Meet)
                                </a>
                            )}
                        </div>
                    )}
                    <DialogFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>Fermer</Button>
                        <div className="space-x-2">
                            <Button onClick={handleEditEvent} variant="secondary">
                                <Edit className="mr-2 h-4 w-4" /> Modifier
                            </Button>
                            <Button onClick={handleDeleteEvent} variant="destructive">
                                <Trash className="mr-2 h-4 w-4" /> Supprimer
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
};

export default CalendarPage;
