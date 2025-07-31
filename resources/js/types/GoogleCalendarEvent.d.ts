export interface GoogleCalendarEvent {
    id: string;
    summary?: string;
    description?: string;
    location?: string;
    start: { dateTime?: string; timeZone?: string; date?: string; };
    end: { dateTime?: string; timeZone?: string; date?: string; };
    hangoutLink?: string;
    htmlLink?: string;
    attendees?: Array<{ email: string; self?: boolean; responseStatus?: string; displayName?: string }>; // Added more attendee properties
    status?: string; // Added status for potential use
    // Add other fields you might receive from Google Calendar API
}

export interface CreateCalendarEventPayload {
    summary: string;
    description?: string;
    start_datetime: string; // Expected format for API: 'YYYY-MM-DDTHH:MM' or 'YYYY-MM-DD' for all-day
    end_datetime: string;   // Expected format for API: 'YYYY-MM-DDTHH:MM' or 'YYYY-MM-DD' for all-day
    attendees?: Array<{ email: string }>;
    location?: string;
    // You might add a timezone field here if your backend supports it
}
