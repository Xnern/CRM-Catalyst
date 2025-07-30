export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string; // ISO 8601 string (e.g., '2025-07-28T10:00:00+02:00')
        date?: string;     // YYYY-MM-DD string for all-day events
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
        self?: boolean;
        responseStatus?: 'accepted' | 'tentative' | 'declined' | 'needsAction';
    }>;
    htmlLink: string; // URL vers l'événement dans Google Calendar
    status?: 'confirmed' | 'tentative' | 'cancelled';
    // Ajoutez d'autres propriétés de l'API Google Calendar si nécessaire
    // Par exemple: organizer, creator, created, updated, recurringEventId, originalStartTime
}

// Payload pour la création d'un événement
export interface CreateCalendarEventPayload {
    summary: string;
    description?: string;
    start_datetime: string; // Format attendu par le backend: 'YYYY-MM-DDTHH:mm:ss'
    end_datetime: string;   // Format attendu par le backend: 'YYYY-MM-DDTHH:mm:ss'
    attendees?: { email: string }[];
}
