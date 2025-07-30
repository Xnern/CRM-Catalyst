// resources/js/services/api.ts

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Contact } from '@/types/Contact'; // Keep this if Contact is defined elsewhere

// Define Google Calendar interfaces directly in this file
// Ensure these are exported so other files can import them
export interface GoogleCalendarEvent {
    id: string;
    summary?: string; // summary can sometimes be optional or null
    description?: string;
    location?: string;
    start: { dateTime?: string; timeZone?: string; date?: string; }; // dateTime or date, and timezone
    end: { dateTime?: string; timeZone?: string; date?: string; };
    hangoutLink?: string; // Google Meet link
    htmlLink?: string; // Link to the event in Google Calendar
    attendees?: Array<{ email: string }>; // List of attendees
    // Add other fields you might receive from Google Calendar API
}

export interface CreateCalendarEventPayload {
    summary: string;
    description?: string;
    start_datetime: string; // Expected format for API: 'YYYY-MM-DDTHH:MM'
    end_datetime: string;   // Expected format for API: 'YYYY-MM-DDTHH:MM'
    attendees?: Array<{ email: string }>;
    location?: string;
    // You might add a timezone field here if your backend supports it
}

// Interface for the specific response from the Google Auth URL endpoint
export interface GoogleAuthUrlResponse {
    auth_url: string;
}

// Query parameters for fetching contacts (assuming this is used elsewhere)
export interface GetContactsQueryParams {
    page?: number;
    per_page?: number;
    search?: string;
    sort?: string;
    include?: string; // Relationships to include (e.g., 'user')
}

// Interface for Laravel's paginated API response structure
interface PaginatedApiResponse<T> {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number;
    last_page: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

// Utility function to retrieve a cookie by name
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// RTK Query API creation
export const api = createApi({
  reducerPath: 'api', // Reducer path in the Redux store

  baseQuery: fetchBaseQuery({
    baseUrl: 'http://127.0.0.1:8000/api', // Base URL for the Laravel API
    credentials: 'include', // Important for sending session cookies (Laravel Sanctum)

    // Prepares headers for outgoing requests
    prepareHeaders: (headers) => {
      const xsrfToken = getCookie('XSRF-TOKEN');

      if (xsrfToken) {
        headers.set('X-XSRF-TOKEN', decodeURIComponent(xsrfToken)); // CSRF token for Laravel
      }

      // Ensure Laravel recognizes the request as AJAX/JSON
      if (!headers.has('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest');
      }
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }

      return headers;
    },
  }),

  tagTypes: ['Contact', 'GoogleCalendarEvent'], // Add the tag for Google Calendar events

  endpoints: (builder) => ({
    // Fetches a paginated list of contacts
    getContacts: builder.query<PaginatedApiResponse<Contact>, GetContactsQueryParams>({
        query: ({ page = 1, per_page = 15, search = '', sort = '', include = '' }) => {
          const params = new URLSearchParams();
          params.append('page', page.toString());
          params.append('per_page', per_page.toString());

          if (search) {
            params.append('search', search);
          }
          if (sort) {
            params.append('sort', sort);
          }
          if (include) {
            params.append('include', include);
          }
          return `contacts?${params.toString()}`;
        },
        // Provides 'Contact' tags for caching, including 'LIST' for the overall list
        providesTags: (result) =>
          result
            ? [...result.data.map(({ id }) => ({ type: 'Contact' as const, id })), { type: 'Contact', id: 'LIST' }]
            : [{ type: 'Contact', id: 'LIST' }],
    }),

    // Adds a new contact
    addContact: builder.mutation<Contact, Partial<Contact>>({
      query: (newContact) => ({
        url: '/contacts',
        method: 'POST',
        body: newContact,
      }),
      invalidatesTags: ['Contact'], // Invalidates 'Contact' cache to refresh lists
    }),

    // Updates an existing contact (can include status update)
    updateContact: builder.mutation<Contact, Partial<Contact>>({
      query: ({ id, ...patch }) => ({
        url: `/contacts/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Contact', id }, { type: 'Contact', id: 'LIST' }],
    }),

    // Deletes a contact
    deleteContact: builder.mutation<void, number>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Contact'], // Invalidates 'Contact' cache to refresh lists
    }),

    // NEW: Mutation specifically for updating contact status for Kanban
    updateContactStatus: builder.mutation<Contact, { id: number; status: Contact['status'] }>({
        query: ({ id, status }) => ({
            url: `/contacts/${id}/status`, // The dedicated endpoint we created
            method: 'PUT',
            body: { status },
        }),
        // Invalidates the specific item and the list to ensure groupings are updated
        invalidatesTags: (result, error, { id }) => [{ type: 'Contact', id }, { type: 'Contact', id: 'LIST' }],
    }),

    // Google Calendar Endpoints
    // Use the specific GoogleAuthUrlResponse interface
    getGoogleAuthUrl: builder.query<GoogleAuthUrlResponse, void>({
        query: () => '/auth/google/redirect',
    }),
    getGoogleCalendarEvents: builder.query<GoogleCalendarEvent[], void>({
        query: () => '/google-calendar/events',
        providesTags: ['GoogleCalendarEvent'], // Tag for calendar events
    }),
    createGoogleCalendarEvent: builder.mutation<GoogleCalendarEvent, CreateCalendarEventPayload>({
        query: (newEvent) => ({
            url: '/google-calendar/events',
            method: 'POST',
            body: newEvent,
        }),
        invalidatesTags: ['GoogleCalendarEvent'], // Invalidate cache after creation
    }),
    // You can add mutations for updateGoogleCalendarEvent, deleteGoogleCalendarEvent, etc.
  }),
});

// Export RTK Query hooks for each endpoint
export const {
  useGetContactsQuery,
  useAddContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useUpdateContactStatusMutation, // Export the hook for Kanban

  useGetGoogleAuthUrlQuery,
  useGetGoogleCalendarEventsQuery,
  useCreateGoogleCalendarEventMutation,
} = api;
