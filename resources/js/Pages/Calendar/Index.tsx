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
    useLogoutGoogleCalendarMutation,
    useGetLocalCalendarEventsQuery,
    useCreateLocalCalendarEventMutation,
    useUpdateLocalCalendarEventMutation,
    useDeleteLocalCalendarEventMutation,
    GoogleAuthUrlResponse,
} from '@/services/api';
import { GoogleCalendarEvent, CreateCalendarEventPayload, } from '@/types/GoogleCalendarEvent';

import { LocalCalendarEvent } from '@/types/LocalCalendarEvent';

import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { format, isValid, parseISO, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Link, BookOpen, Edit, Trash, PlusCircle, MoreVertical, LogOut, RefreshCcw } from 'lucide-react';

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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/Components/ui/dropdown-menu';
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
        originalGoogleEvent: GoogleCalendarEvent | LocalCalendarEvent;
    };
}

// Mapper les événements Google Calendar vers le format FullCalendar
const mapGoogleEventsToFullCalendar = (googleEvents: GoogleCalendarEvent[]): FullCalendarEvent[] => {
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

// Mapper les événements locaux vers le format FullCalendar
const mapLocalEventsToFullCalendar = (localEvents: LocalCalendarEvent[]): FullCalendarEvent[] => {
    if (!Array.isArray(localEvents)) {
        return [];
    }
    return localEvents.map(event => ({
        id: event.id.toString(),
        title: event.title || 'Événement local',
        start: event.start_datetime,
        end: event.end_datetime,
        allDay: false,
        extendedProps: {
            description: event.description,
            originalGoogleEvent: event,
        },
    }));
};

const CalendarPage: React.FC<PageProps> = ({ auth }) => {
    // Hooks Google Calendar
    const { data: authUrlResponse, isLoading: authUrlLoading, isError: authUrlError } = useGetGoogleAuthUrlQuery();
    const {
        data: googleEvents,
        isLoading: isGoogleEventsLoading,
        isError: isGoogleEventsError,
        isSuccess: isGoogleEventsSuccess,
        refetch: refetchGoogleEvents,
    } = useGetGoogleCalendarEventsQuery();

    // Hooks Local Calendar
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

    // NOUVEAU: Hooks pour les événements locaux
    const [createLocalEvent, { isLoading: isCreatingLocalEvent }] = useCreateLocalCalendarEventMutation();
    const [updateLocalEvent, { isLoading: isUpdatingLocalEvent }] = useUpdateLocalCalendarEventMutation();
    const [deleteLocalEvent, { isLoading: isDeletingLocalEvent }] = useDeleteLocalCalendarEventMutation();

    const isGoogleConnected = isGoogleEventsSuccess;

    // Logique pour déterminer les événements à afficher.
    const eventsToDisplay: FullCalendarEvent[] = isGoogleConnected
        ? mapGoogleEventsToFullCalendar(googleEvents || [])
        : mapLocalEventsToFullCalendar(localEvents || []);

    // États de chargement et d'erreur consolidés pour une meilleure lisibilité
    const isLoading = isGoogleEventsLoading || isLocalEventsLoading;
    const isError = isGoogleEventsError || isLocalEventsError;


    const initialCreateFormState = () => {
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
    };

    const [createForm, setCreateForm] = useState<CreateCalendarEventPayload>(initialCreateFormState);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<GoogleCalendarEvent | LocalCalendarEvent | null>(null);
    const [isEditingEvent, setIsEditingEvent] = useState(false);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);

    const initialEditFormState = () => {
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
    };
    const [editForm, setEditForm] = useState<CreateCalendarEventPayload & { eventId: string | number | null }>(initialEditFormState);

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
            refetchGoogleEvents();
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        } else if (googleAuthStatus === 'failed' || googleAuthStatus === 'error') {
            const message = urlParams.get('message') || 'Échec de la connexion à Google Calendar. Veuillez réessayer.';
            toast.error(message);
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }
    }, [refetchGoogleEvents]);

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

    const handleLogout = async () => {
        try {
            await logoutGoogleCalendar().unwrap();
            toast.success('Vous avez été déconnecté de Google Calendar.');
        } catch (error) {
            console.error('Erreur lors de la déconnexion de Google :', error);
            toast.error('Échec de la déconnexion de Google Calendar.');
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        const formPayload = {
            title: createForm.summary,
            description: createForm.description,
            start_datetime: createForm.start_datetime,
            end_datetime: createForm.end_datetime,
        };

        if (!formPayload.title.trim()) {
            toast.error("Le titre de l'événement est obligatoire.");
            return;
        }
        if (new Date(formPayload.start_datetime).getTime() >= new Date(formPayload.end_datetime).getTime()) {
            toast.error("La date de fin doit être postérieure à la date de début.");
            return;
        }

        try {
            if (isGoogleConnected) {
                await createGoogleEvent(createForm as CreateCalendarEventPayload).unwrap();
                toast.success('Événement créé avec succès sur Google Calendar !');
                refetchGoogleEvents();
            } else {
                await createLocalEvent(formPayload).unwrap();
                toast.success('Événement local créé avec succès !');
                refetchLocalEvents();
            }
            setCreateForm(initialCreateFormState());
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Erreur lors de la création de l\'événement :', error);
            const errorMessage = (error as any)?.data?.message || (error as any)?.message || 'Une erreur inconnue est survenue.';
            toast.error(`Échec de la création de l\'événement: ${errorMessage}`);
        }
    };

    const handleEventClick = (clickInfo: any) => {
        const event = clickInfo.event.extendedProps.originalGoogleEvent;

        if (!event) {
            console.error("L'événement cliqué n'a pas de données originales.");
            return;
        }

        setSelectedEvent(event);
        setIsEditingEvent(false);

        const isGoogleEvent = 'summary' in event;

        if (isGoogleEvent) {
            const googleEvent = event as GoogleCalendarEvent;
            let startDatetime = '';
            let endDatetime = '';

            if (googleEvent.start?.dateTime) {
                const start = parseISO(googleEvent.start.dateTime);
                const end = parseISO(googleEvent.end?.dateTime || googleEvent.start.dateTime);
                startDatetime = formatDatetimeLocal(start);
                endDatetime = formatDatetimeLocal(end);
            } else if (googleEvent.start?.date) {
                const startDate = new Date(googleEvent.start.date);
                const endDate = googleEvent.end?.date ? new Date(googleEvent.end.date) : new Date(googleEvent.start.date);

                const correctedEndDate = subDays(endDate, 1);

                startDatetime = format(startDate, "yyyy-MM-dd'T'HH:mm");
                endDatetime = format(correctedEndDate, "yyyy-MM-dd'T'HH:mm");
            }

            setEditForm({
                eventId: googleEvent.id || null,
                summary: googleEvent.summary || '',
                description: googleEvent.description || '',
                location: googleEvent.location || '',
                start_datetime: startDatetime,
                end_datetime: endDatetime,
                attendees: googleEvent.attendees?.map(att => att.email!) || [],
            });
        } else {
            const localEvent = event as LocalCalendarEvent;
            // Correction pour les événements locaux :
            // Nous devons nettoyer la chaîne de caractères ISO 8601 pour le champ datetime-local
            const cleanedStart = localEvent.start_datetime.split('.')[0].replace('Z', '');
            const cleanedEnd = localEvent.end_datetime.split('.')[0].replace('Z', '');

            setEditForm({
                eventId: localEvent.id,
                summary: localEvent.title || '',
                description: localEvent.description || '',
                location: '',
                start_datetime: cleanedStart,
                end_datetime: cleanedEnd,
                attendees: [],
            });
        }
        setIsDetailModalOpen(true);
    };

    // Fonction de réinitialisation des états des modales
    const resetModalStates = () => {
        setIsDetailModalOpen(false);
        setIsEditingEvent(false);
        setIsDeleteConfirmModalOpen(false);
        setSelectedEvent(null);
    }

    const handleEventDrop = async (dropInfo: any) => {
        if (!isGoogleConnected) {
            dropInfo.revert();
            toast.info("Les événements locaux ne peuvent pas être modifiés par glisser-déposer.");
            return;
        }

        const event = dropInfo.event.extendedProps.originalGoogleEvent as GoogleCalendarEvent;
        if (!event || !event.id) {
            dropInfo.revert();
            toast.error("Erreur: Impossible de modifier l'événement. Informations manquantes.");
            return;
        }

        const newStart = dropInfo.event.start;
        const newEnd = dropInfo.event.end;

        const payload = {
            eventId: event.id,
            summary: event.summary || 'Événement sans titre',
            description: event.description || '',
            location: event.location || '',
            start_datetime: formatDatetimeLocal(newStart),
            end_datetime: formatDatetimeLocal(newEnd || newStart),
        };

        try {
            await updateGoogleEvent(payload).unwrap();
            toast.success('Événement Google mis à jour par glisser-déposer !');
        } catch (error) {
            console.error('Erreur lors du déplacement de l\'événement :', error);
            const errorMessage = (error as any)?.data?.message || (error as any)?.message || 'Une erreur inconnue est survenue.';
            toast.error(`Échec du déplacement de l\'événement: ${errorMessage}`);
            dropInfo.revert();
        }
    };

    const handleEventResize = async (resizeInfo: any) => {
        if (!isGoogleConnected) {
            resizeInfo.revert();
            toast.info("Les événements locaux ne peuvent pas être modifiés par redimensionnement.");
            return;
        }

        const event = resizeInfo.event.extendedProps.originalGoogleEvent as GoogleCalendarEvent;
        if (!event || !event.id) {
            resizeInfo.revert();
            toast.error("Erreur: Impossible de modifier l'événement. Informations manquantes.");
            return;
        }

        const newStart = resizeInfo.event.start;
        const newEnd = resizeInfo.event.end;

        const payload = {
            eventId: event.id,
            summary: event.summary || 'Événement sans titre',
            description: event.description || '',
            location: event.location || '',
            start_datetime: formatDatetimeLocal(newStart),
            end_datetime: formatDatetimeLocal(newEnd || newStart),
        };

        try {
            await updateGoogleEvent(payload).unwrap();
            toast.success('Événement Google mis à jour par redimensionnement !');
        } catch (error) {
            console.error('Erreur lors du redimensionnement de l\'événement :', error);
            const errorMessage = (error as any)?.data?.message || (error as any)?.message || 'Une erreur inconnue est survenue.';
            toast.error(`Échec du redimensionnement de l\'événement: ${errorMessage}`);
            resizeInfo.revert();
        }
    };

    const handleEditButtonClick = () => {
        if (!selectedEvent) return; // Sécurité
        setIsEditingEvent(true);
    };

    const handleUpdateEvent = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEvent) return;

        const isGoogleEvent = 'summary' in selectedEvent;

        if (!editForm.summary.trim()) {
            toast.error("Le titre de l'événement est obligatoire.");
            return;
        }
        if (new Date(editForm.start_datetime).getTime() >= new Date(editForm.end_datetime).getTime()) {
            toast.error("La date de fin doit être postérieure à la date de début.");
            return;
        }

        try {
            if (isGoogleEvent) {
                await updateGoogleEvent({
                    eventId: selectedEvent.id as string,
                    summary: editForm.summary,
                    description: editForm.description,
                    location: editForm.location,
                    start_datetime: editForm.start_datetime,
                    end_datetime: editForm.end_datetime,
                    attendees: editForm.attendees,
                }).unwrap();
                toast.success('Événement Google mis à jour avec succès !');
                refetchGoogleEvents();
            } else {
                await updateLocalEvent({
                    eventId: selectedEvent.id as number,
                    title: editForm.summary,
                    description: editForm.description,
                    start_datetime: editForm.start_datetime,
                    end_datetime: editForm.end_datetime,
                }).unwrap();
                toast.success('Événement local mis à jour avec succès !');
                refetchLocalEvents();
            }

            resetModalStates();
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'événement :', error);
            const errorMessage = (error as any)?.data?.message || (error as any)?.message || 'Une erreur inconnue est survenue.';
            toast.error(`Échec de la mise à jour de l\'événement: ${errorMessage}`);
        }
    };

    const handleInitiateDelete = () => {
        if (!selectedEvent) return;
        setIsDeleteConfirmModalOpen(true);
    };

    const confirmDeleteEvent = async () => {
        if (!selectedEvent) return;

        const isGoogleEvent = 'summary' in selectedEvent;

        try {
            if (isGoogleEvent) {
                await deleteGoogleEvent(selectedEvent.id as string).unwrap();
                toast.success('Événement Google supprimé avec succès !');
                refetchGoogleEvents();
            } else {
                await deleteLocalEvent(selectedEvent.id as number).unwrap();
                toast.success('Événement local supprimé avec succès !');
                refetchLocalEvents();
            }

            resetModalStates();
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'événement :', error);
            const errorMessage = (error as any)?.data?.message || (error as any)?.message || 'Une erreur inconnue est survenue.';
            toast.error(`Échec de la suppression de l\'événement: ${errorMessage}`);
        }
    };

    const handleOpenCreateModal = () => {
        setCreateForm(initialCreateFormState());
        setIsCreateModalOpen(true);
    };

    // Logique pour le bouton "Créer un événement" et le menu déroulant
    const renderCalendarButtons = () => {
        if (isGoogleConnected) {
            return (
                <>
                    <Button onClick={refetchGoogleEvents} variant="outline" size="icon" className="hover:bg-gray-100">
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleOpenCreateModal} className="bg-blue-600 hover:bg-blue-700 text-black">
                        <PlusCircle className="mr-2 h-4 w-4" /> Créer un événement
                    </Button>
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
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                                <LogOut className="mr-2 h-4 w-4" /> Déconnecter
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            );
        } else {
            return (
                <>
                    <Button onClick={refetchLocalEvents} variant="outline" size="icon" className="hover:bg-gray-100">
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleOpenCreateModal} className="bg-white border border-primary text-black">
                        <PlusCircle className="mr-2 h-4 w-4" /> Créer un événement
                    </Button>
                    <Button onClick={handleAuthRedirect} className="bg-gray-200 hover:bg-gray-300 text-gray-800">
                        <img src="https://www.google.com/favicon.ico" alt="Google Icon" className="h-4 w-4 mr-2" />
                        Connecter Google
                    </Button>
                </>
            );
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Calendrier</h2>}
        >
            <Head title="Calendrier" />

            <div className="py-6 h-full flex flex-col">
                <div className="flex-grow h-full">
                    <div className="bg-white overflow-hidden sm:rounded-lg px-6 h-full flex flex-col space-y-6">
                        <Card className="flex-shrink-0 shadow-none border-0">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
                                <div>
                                    <CardTitle className="text-2xl font-bold">Calendrier</CardTitle>
                                    <CardDescription>
                                        {isGoogleConnected ?
                                            "Synchronisé avec Google Calendar." :
                                            "Affichage du calendrier local."
                                        }
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {renderCalendarButtons()}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="full-calendar-container relative" style={{ height: '100%', width: '100%' }}>
                                    <FullCalendar
                                        ref={calendarRef}
                                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, momentPlugin, momentTimezonePlugin]}
                                        initialView="dayGridMonth"
                                        headerToolbar={{
                                            left: 'prev,next today',
                                            center: 'title',
                                            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                                        }}
                                        // Utilisation de `eventsToDisplay`
                                        events={eventsToDisplay}
                                        eventClick={handleEventClick}
                                        editable={true}
                                        eventDrop={handleEventDrop}
                                        eventResize={handleEventResize}
                                        locale="fr"
                                    />
                                    {isLoading && (
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

            {/* Modale de Création d'Événement */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[425px] !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2">
                    <DialogHeader>
                        <DialogTitle>Créer un Nouvel Événement {isGoogleConnected ? 'Google Calendar' : 'Local'}</DialogTitle>
                        <DialogDescription>
                            Entrez les détails pour planifier un événement dans votre calendrier.
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
                         {isGoogleConnected && (
                            <div className="space-y-2 col-span-full">
                                <Label htmlFor="create-location">Lieu</Label>
                                <Input
                                    id="create-location"
                                    value={createForm.location || ''}
                                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                                    placeholder="Ex: Bureau, Visio, Adresse..."
                                />
                            </div>
                        )}
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
                            <Button type="submit" disabled={isCreatingGoogleEvent || isCreatingLocalEvent}>
                                {(isCreatingGoogleEvent || isCreatingLocalEvent) ? (
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
                if (!open) {
                    resetModalStates();
                }
            }}>
                <DialogContent className="sm:max-w-[425px] [&>button]:!hidden !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2">
                    <DialogHeader className="pr-8">
                        <div>
                            <DialogTitle>{selectedEvent?.summary || selectedEvent?.title || 'Détails de l\'événement'}</DialogTitle>
                            {selectedEvent?.description && (
                                <DialogDescription className="text-gray-500 mt-3">
                                    {selectedEvent.description}
                                </DialogDescription>
                            )}
                        </div>
                    </DialogHeader>

                    {selectedEvent && (
                        <div className="absolute top-4 right-4">
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
                                    <DropdownMenuItem onClick={handleInitiateDelete} className="text-red-600 focus:text-red-600">
                                        <Trash className="mr-2 h-4 w-4" /> Supprimer
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

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
                                {isGoogleConnected && (
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-location">Lieu</Label>
                                        <Input
                                            id="edit-location"
                                            value={editForm.location || ''}
                                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                            placeholder="Ex: Bureau, Visio, Adresse..."
                                        />
                                    </div>
                                )}
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
                                    <Button type="submit" disabled={isUpdatingGoogleEvent || isUpdatingLocalEvent}>
                                        {(isUpdatingGoogleEvent || isUpdatingLocalEvent) ? (
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
                                    <span className="font-semibold">Début :</span>
                                    {'start_datetime' in selectedEvent
                                        ? format(new Date(selectedEvent.start_datetime), 'dd/MM/yyyy HH:mm')
                                        : selectedEvent.start?.dateTime ? format(new Date(selectedEvent.start.dateTime), 'dd/MM/yyyy HH:mm') : selectedEvent.start?.date ? format(new Date(selectedEvent.start.date), 'dd/MM/yyyy') : 'N/A'
                                    }
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-semibold">Fin :</span>
                                    {'end_datetime' in selectedEvent
                                        ? format(new Date(selectedEvent.end_datetime), 'dd/MM/yyyy HH:mm')
                                        : selectedEvent.end?.dateTime ? format(new Date(selectedEvent.end.dateTime), 'dd/MM/yyyy HH:mm') : selectedEvent.end?.date ? format(new Date(selectedEvent.end.date), 'dd/MM/yyyy') : 'N/A'
                                    }
                                </p>
                                {isGoogleConnected && ('location' in selectedEvent && selectedEvent.location) && (
                                    <p className="text-gray-600">
                                        <span className="font-semibold">Lieu :</span> {selectedEvent.location}
                                    </p>
                                )}
                                {isGoogleConnected && ('hangoutLink' in selectedEvent && selectedEvent.hangoutLink) && (
                                    <a href={selectedEvent.hangoutLink} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline flex items-center text-sm">
                                        <Link className="mr-2 h-4 w-4" /> Rejoindre la réunion (Meet)
                                    </a>
                                )}

                                <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mt-6 gap-2">
                                    {isGoogleConnected && ('htmlLink' in selectedEvent && selectedEvent.htmlLink) && (
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

            {/* Modale de Confirmation de Suppression */}
            <AlertDialog open={isDeleteConfirmModalOpen} onOpenChange={setIsDeleteConfirmModalOpen}>
                <AlertDialogContent className="sm:max-w-[425px] !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Cela supprimera définitivement votre événement
                            "<span className="font-bold">{selectedEvent?.summary || selectedEvent?.title || 'cet événement'}</span>" {isGoogleConnected ? 'de Google Calendar.' : 'de votre calendrier local.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteEvent}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isDeletingGoogleEvent || isDeletingLocalEvent}
                        >
                            {(isDeletingGoogleEvent || isDeletingLocalEvent) ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Suppression...
                                </>
                            ) : (
                                'Supprimer'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AuthenticatedLayout>
    );
};

export default CalendarPage;
