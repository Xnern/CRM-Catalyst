// resources/js/Pages/Calendar/CalendarPage.tsx

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
    GoogleCalendarEvent,
    CreateCalendarEventPayload,
    GoogleAuthUrlResponse
} from '@/services/api';

import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { format, isValid, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Link, BookOpen, Edit, Trash, PlusCircle, MoreVertical } from 'lucide-react';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import momentPlugin from '@fullcalendar/moment';
import momentTimezonePlugin from '@fullcalendar/moment-timezone';

// Shadcn UI components for dialog/dropdown
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/Components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/Components/ui/dropdown-menu';


// Helper to format datetimes for HTML datetime-local input
const formatDatetimeLocal = (date: Date): string => {
    if (!isValid(date)) {
        const now = new Date();
        return format(now, "yyyy-MM-dd'T'HH:mm");
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
        originalGoogleEvent: GoogleCalendarEvent;
    };
}

// Mapper les événements Google Calendar vers le format FullCalendar
const mapGoogleEventsToFullCalendar = (googleEvents: GoogleCalendarEvent[]): FullCalendarEvent[] => {
    if (!googleEvents) return [];
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
                originalGoogleEvent: event,
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
    const [updateEvent, { isLoading: isUpdatingEvent }] = useUpdateGoogleCalendarEventMutation();
    const [deleteEvent, { isLoading: isDeletingEvent }] = useDeleteGoogleCalendarEventMutation();

    const [createForm, setCreateForm] = useState<CreateCalendarEventPayload>(() => {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 3600 * 1000);
        return {
            summary: '',
            description: '',
            start_datetime: formatDatetimeLocal(now),
            end_datetime: formatDatetimeLocal(oneHourLater),
            attendees: [],
            location: '',
        };
    });

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<GoogleCalendarEvent | null>(null);
    const [isEditingEvent, setIsEditingEvent] = useState(false);

    const [editForm, setEditForm] = useState<CreateCalendarEventPayload & { eventId: string | null }>(() => {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 3600 * 1000);
        return {
            eventId: null,
            summary: '',
            description: '',
            start_datetime: formatDatetimeLocal(now),
            end_datetime: formatDatetimeLocal(oneHourLater),
            attendees: [],
            location: '',
        };
    });

    const calendarRef = useRef<FullCalendar>(null);

    const handleCalendarResize = useCallback(() => {
        if (calendarRef.current) {
            calendarRef.current.getApi().updateSize();
        }
    }, []);

    useEffect(() => {
        const calendarContainer = document.querySelector('.full-calendar-container');

        if (calendarContainer) {
            const resizeObserver = new ResizeObserver(() => {
                handleCalendarResize();
            });

            resizeObserver.observe(calendarContainer);

            return () => {
                resizeObserver.unobserve(calendarContainer);
            };
        }
    }, [handleCalendarResize]);

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
        if (!createForm.summary.trim()) {
            toast.error("Le titre de l'événement est obligatoire.");
            return;
        }
        if (new Date(createForm.start_datetime).getTime() >= new Date(createForm.end_datetime).getTime()) {
            toast.error("La date de fin doit être postérieure à la date de début.");
            return;
        }

        try {
            await createEvent(createForm).unwrap();
            toast.success('Événement créé avec succès sur Google Calendar !');
            const now = new Date();
            const oneHourLater = new Date(now.getTime() + 3600 * 1000);
            setCreateForm({
                summary: '',
                description: '',
                start_datetime: formatDatetimeLocal(now),
                end_datetime: formatDatetimeLocal(oneHourLater),
                attendees: [],
                location: '',
            });
            setIsCreateModalOpen(false);
            refetch();
        } catch (error) {
            console.error('Erreur lors de la création de l\'événement Google Calendar :', error);
            const errorMessage = (error as any)?.data?.message || (error as any)?.message || 'Une erreur inconnue est survenue.';
            toast.error(`Échec de la création de l\'événement: ${errorMessage}`);
        }
    };

    const handleEventClick = (clickInfo: any) => {
        const googleEvent = clickInfo.event.extendedProps.originalGoogleEvent as GoogleCalendarEvent;
        setSelectedEvent(googleEvent);
        setIsEditingEvent(false);
        setEditForm({
            eventId: googleEvent.id || null,
            summary: googleEvent.summary || '',
            description: googleEvent.description || '',
            location: googleEvent.location || '',
            start_datetime: googleEvent.start?.dateTime ? formatDatetimeLocal(parseISO(googleEvent.start.dateTime)) : (googleEvent.start?.date ? formatDatetimeLocal(parseISO(googleEvent.start.date)) : ''),
            end_datetime: googleEvent.end?.dateTime ? formatDatetimeLocal(parseISO(googleEvent.end.dateTime)) : (googleEvent.end?.date ? formatDatetimeLocal(parseISO(googleEvent.end.date)) : ''),
            attendees: googleEvent.attendees?.map(att => att.email!) || [],
        });

        setIsDetailModalOpen(true);
    };

    const handleEventDrop = async (dropInfo: any) => {
        const eventId = dropInfo.event.id;
        const newStart = dropInfo.event.startStr;
        const newEnd = dropInfo.event.endStr;

        const originalEvent = dropInfo.event.extendedProps.originalGoogleEvent as GoogleCalendarEvent;

        const updatePayload = {
            eventId: eventId,
            summary: originalEvent.summary || '',
            description: originalEvent.description || '',
            location: originalEvent.location || '',
            start_datetime: newStart,
            end_datetime: newEnd,
            attendees: originalEvent.attendees?.map(att => att.email!) || [],
        };

        try {
            await updateEvent(updatePayload).unwrap();
            toast.success('Événement déplacé avec succès !');
            refetch();
        } catch (error) {
            console.error('Erreur lors du déplacement de l\'événement :', error);
            toast.error('Échec du déplacement de l\'événement.');
            dropInfo.revert();
        }
    };

    const handleEventResize = async (resizeInfo: any) => {
        const eventId = resizeInfo.event.id;
        const newStart = resizeInfo.event.startStr;
        const newEnd = resizeInfo.event.endStr;

        const originalEvent = resizeInfo.event.extendedProps.originalGoogleEvent as GoogleCalendarEvent;

        const updatePayload = {
            eventId: eventId,
            summary: originalEvent.summary || '',
            description: originalEvent.description || '',
            location: originalEvent.location || '',
            start_datetime: newStart,
            end_datetime: newEnd,
            attendees: originalEvent.attendees?.map(att => att.email!) || [],
        };

        try {
            await updateEvent(updatePayload).unwrap();
            toast.success('Événement redimensionné avec succès !');
            refetch();
        } catch (error) {
            console.error('Erreur lors du redimensionnement de l\'événement :', error);
            toast.error('Échec du redimensionnement de l\'événement.');
            resizeInfo.revert();
        }
    };

    // Fonctions pour la modale de détails/édition
    const handleEditButtonClick = () => {
        setIsEditingEvent(true);
    };

    const handleUpdateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editForm.eventId) {
            toast.error("Impossible de modifier un événement sans ID.");
            return;
        }
        if (!editForm.summary.trim()) {
            toast.error("Le titre de l'événement est obligatoire.");
            return;
        }
        if (new Date(editForm.start_datetime).getTime() >= new Date(editForm.end_datetime).getTime()) {
            toast.error("La date de fin doit être postérieure à la date de début.");
            return;
        }

        try {
            await updateEvent(editForm).unwrap();
            toast.success('Événement mis à jour avec succès !');
            setIsDetailModalOpen(false);
            setIsEditingEvent(false);
            refetch();
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'événement :', error);
            const errorMessage = (error as any)?.data?.message || (error as any)?.message || 'Une erreur inconnue est survenue.';
            toast.error(`Échec de la mise à jour de l\'événement: ${errorMessage}`);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent?.id) {
            toast.error("Impossible de supprimer un événement sans ID.");
            return;
        }

        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.")) {
            return;
        }

        try {
            await deleteEvent(selectedEvent.id).unwrap();
            toast.success('Événement supprimé avec succès !');
            setIsDetailModalOpen(false);
            setSelectedEvent(null);
            setIsEditingEvent(false);
            refetch();
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'événement :', error);
            const errorMessage = (error as any)?.data?.message || (error as any)?.message || 'Une erreur inconnue est survenue.';
            toast.error(`Échec de la suppression de l\'événement: ${errorMessage}`);
        }
    };

    const handleOpenCreateModal = () => {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 3600 * 1000);
        setCreateForm({
            summary: '',
            description: '',
            start_datetime: formatDatetimeLocal(now),
            end_datetime: formatDatetimeLocal(oneHourLater),
            attendees: [],
            location: '',
        });
        setIsCreateModalOpen(true);
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
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                                {/* Condition pour afficher le titre d'intégration si non connecté */}
                                {!events && (
                                    <div>
                                        <CardTitle className="text-2xl font-bold">Intégration Google Calendar</CardTitle>
                                        <CardDescription>Gérez vos rendez-vous directement depuis votre CRM.</CardDescription>
                                    </div>
                                )}
                                {events && (
                                    <div className="flex w-full items-center justify-between space-x-2">
                                        <h2 className="text-3xl font-semibold mb-4 text-gray-800">Vos Événements Google Calendar</h2>
                                        <Button onClick={handleOpenCreateModal} className="bg-teal-600 hover:bg-teal-700 text-white">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Créer un événement
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                {/* Le reste de votre contenu de carte (connexion ou calendrier) */}
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

                                        {eventsLoading ? (
                                            <div className="flex items-center text-gray-600">
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Chargement des événements...
                                            </div>
                                        ) : eventsError ? (
                                            <p className="text-red-500">Erreur lors du chargement des événements : {(eventsError as any)?.data?.message || (eventsError as any)?.message || 'Une erreur inconnue est survenue.'}</p>
                                        ) : (
                                            <div className="full-calendar-container" style={{ height: '100%', width: '100%' }}>
                                                <hr className="my-12"/>

                                                <FullCalendar
                                                    ref={calendarRef}
                                                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, momentPlugin, momentTimezonePlugin]}
                                                    initialView="dayGridMonth"
                                                    headerToolbar={{
                                                        left: 'prev,next today',
                                                        center: 'title',
                                                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                                                    }}
                                                    events={mapGoogleEventsToFullCalendar(events)}
                                                    eventClick={handleEventClick}
                                                    editable={true}
                                                    selectable={true}
                                                    eventDrop={handleEventDrop}
                                                    eventResize={handleEventResize}
                                                    locale="fr"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Modale de Création d'Événement */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Créer un Nouvel Événement Google Calendar</DialogTitle>
                        <DialogDescription>
                            Entrez les détails pour planifier un événement dans votre Google Agenda.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-2 col-span-full">
                            <Label htmlFor="create-summary">Titre de l'événement <span className="text-red-500">*</span></Label>
                            <Input
                                id="create-summary"
                                value={createForm.summary}
                                onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })}
                                placeholder="Ex: Réunion avec client X"
                                required
                            />
                        </div>
                        <div className="space-y-2 col-span-full">
                            <Label htmlFor="create-description">Description</Label>
                            <Input
                                id="create-description"
                                value={createForm.description || ''}
                                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                placeholder="Détails de l'événement..."
                            />
                        </div>
                         <div className="space-y-2 col-span-full">
                            <Label htmlFor="create-location">Lieu</Label>
                            <Input
                                id="create-location"
                                value={createForm.location || ''}
                                onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                                placeholder="Ex: Bureau, Visio, Adresse..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create-start_datetime">Début <span className="text-red-500">*</span></Label>
                            <Input
                                id="create-start_datetime"
                                type="datetime-local"
                                value={createForm.start_datetime}
                                onChange={(e) => setCreateForm({ ...createForm, start_datetime: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create-end_datetime">Fin <span className="text-red-500">*</span></Label>
                            <Input
                                id="create-end_datetime"
                                type="datetime-local"
                                value={createForm.end_datetime}
                                onChange={(e) => setCreateForm({ ...createForm, end_datetime: e.target.value })}
                                required
                            />
                        </div>
                        <DialogFooter className="col-span-full flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} type="button">Annuler</Button>
                            <Button type="submit" disabled={isCreatingEvent}>
                                {isCreatingEvent ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Création en cours...
                                    </>
                                ) : (
                                    'Créer l\'événement'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modale de Détails/Modification d'Événement */}
            <Dialog open={isDetailModalOpen} onOpenChange={(open) => {
                setIsDetailModalOpen(open);
                if (!open) {
                    setIsEditingEvent(false);
                    setSelectedEvent(null);
                }
            }}>
                {/* Ajoutez la classe `data-[state=open]:!bg-background/80` et `data-[state=open]:!backdrop-blur-sm` pour assurer que le fond reste visible */}
                <DialogContent className="sm:max-w-[425px] [&>button]:!hidden"> {/* Cache le bouton de fermeture "X" */}
                    <DialogHeader className="flex flex-row justify-between items-center">
                        <div>
                            <DialogTitle>{selectedEvent?.summary || 'Détails de l\'événement'}</DialogTitle>
                            {/* Description sous le titre en gris clair */}
                            {selectedEvent?.description && (
                                <DialogDescription className="text-gray-500 mt-3">
                                    {selectedEvent.description}
                                </DialogDescription>
                            )}
                        </div>
                        {selectedEvent && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Ouvrir le menu</span>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleEditButtonClick}>
                                        <Edit className="mr-2 h-4 w-4" /> Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDeleteEvent} className="text-red-600 focus:text-red-600">
                                        <Trash className="mr-2 h-4 w-4" /> Supprimer
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </DialogHeader>

                    {selectedEvent && (
                        isEditingEvent ? (
                            <form onSubmit={handleUpdateEvent} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-summary">Titre de l'événement <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="edit-summary"
                                        value={editForm.summary}
                                        onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                                        placeholder="Ex: Réunion avec client X"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-description">Description</Label>
                                    <Input
                                        id="edit-description"
                                        value={editForm.description || ''}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        placeholder="Détails de l'événement..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-location">Lieu</Label>
                                    <Input
                                        id="edit-location"
                                        value={editForm.location || ''}
                                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                        placeholder="Ex: Bureau, Visio, Adresse..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-start_datetime">Début <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="edit-start_datetime"
                                            type="datetime-local"
                                            value={editForm.start_datetime}
                                            onChange={(e) => setEditForm({ ...editForm, start_datetime: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-end_datetime">Fin <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="edit-end_datetime"
                                            type="datetime-local"
                                            value={editForm.end_datetime}
                                            onChange={(e) => setEditForm({ ...editForm, end_datetime: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <DialogFooter className="flex justify-end gap-2 mt-6">
                                    <Button variant="outline" onClick={() => setIsEditingEvent(false)} type="button">Annuler</Button>
                                    <Button type="submit" disabled={isUpdatingEvent}>
                                        {isUpdatingEvent ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Mise à jour...
                                            </>
                                        ) : (
                                            <>
                                                <Edit className="mr-2 h-4 w-4" /> Enregistrer les modifs
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        ) : (
                            <div className="space-y-4 py-4">
                                <p className="text-gray-700">
                                    <span className="font-semibold">Début :</span> {selectedEvent.start?.dateTime ? format(new Date(selectedEvent.start.dateTime), 'dd/MM/yyyy HH:mm') : selectedEvent.start?.date ? format(new Date(selectedEvent.start.date), 'dd/MM/yyyy') : 'N/A'}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-semibold">Fin :</span> {selectedEvent.end?.dateTime ? format(new Date(selectedEvent.end.dateTime), 'dd/MM/yyyy HH:mm') : selectedEvent.end?.date ? format(new Date(selectedEvent.end.date), 'dd/MM/yyyy') : 'N/A'}
                                </p>
                                {selectedEvent.location && (
                                    <p className="text-gray-600">
                                        <span className="font-semibold">Lieu :</span> {selectedEvent.location}
                                    </p>
                                )}
                                {selectedEvent.hangoutLink && (
                                    <a href={selectedEvent.hangoutLink} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline flex items-center text-sm">
                                        <Link className="mr-2 h-4 w-4" /> Rejoindre la réunion (Meet)
                                    </a>
                                )}

                                <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mt-6 gap-2">
                                    {selectedEvent.htmlLink && (
                                        <a href={selectedEvent.htmlLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center text-sm order-2 sm:order-1">
                                            <Link className="mr-2 h-4 w-4" /> Voir sur Google Calendar
                                        </a>
                                    )}
                                    <Button variant="outline" onClick={() => setIsDetailModalOpen(false)} className="order-1 sm:order-2">Fermer</Button>
                                </DialogFooter>
                            </div>
                        )
                    )}
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
};

export default CalendarPage;
