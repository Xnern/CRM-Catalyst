/**
 * Interface représentant la structure complète d'un événement
 * de calendrier local tel qu'il est renvoyé par l'API Laravel.
 */
export interface LocalCalendarEvent {
    id: number;
    user_id: number;
    title: string;
    description: string | null;
    start_datetime: string;
    end_datetime: string;
    created_at: string;
    updated_at: string;
}

/**
 * Interface pour le payload de création d'un événement local.
 * Les champs `title`, `start_datetime` et `end_datetime` sont requis.
 */
export interface LocalEventPayload {
    title: string;
    description?: string | null;
    start_datetime: string;
    end_datetime: string;
}

/**
 * Interface pour le payload de mise à jour d'un événement local.
 * Elle inclut l'ID de l'événement en plus des champs du payload de création.
 */
export interface UpdateLocalEventPayload extends LocalEventPayload {
    eventId: number;
}
