// resources/js/services/api.ts

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Contact } from '@/types/Contact';
import { GoogleCalendarEvent,CreateCalendarEventPayload } from '@/types/GoogleCalendarEvent';


// NEW: Payload for updating an event
// It needs the eventId and potentially all fields that can be updated.
// We reuse CreateCalendarEventPayload but add the eventId.
export interface UpdateCalendarEventPayload extends CreateCalendarEventPayload {
    eventId: string; // The ID of the event to update
    // You might also include a flag for allDay if it can be changed
}


export interface GoogleAuthUrlResponse {
    auth_url: string;
}

export interface GetContactsQueryParams {
    page?: number;
    per_page?: number;
    search?: string;
    sort?: string;
    include?: string;
}

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

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://127.0.0.1:8000/api',
    credentials: 'include',
    prepareHeaders: (headers) => {
      const xsrfToken = getCookie('XSRF-TOKEN');
      if (xsrfToken) {
        headers.set('X-XSRF-TOKEN', decodeURIComponent(xsrfToken));
      }
      if (!headers.has('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest');
      }
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }
      return headers;
    },
  }),
  tagTypes: ['Contact', 'GoogleCalendarEvent'],
  endpoints: (builder) => ({
    getContacts: builder.query<PaginatedApiResponse<Contact>, GetContactsQueryParams>({
        query: ({ page = 1, per_page = 15, search = '', sort = '', include = '' }) => {
          const params = new URLSearchParams();
          params.append('page', page.toString());
          params.append('per_page', per_page.toString());
          if (search) { params.append('search', search); }
          if (sort) { params.append('sort', sort); }
          if (include) { params.append('include', include); }
          return `contacts?${params.toString()}`;
        },
        providesTags: (result) =>
          result
            ? [...result.data.map(({ id }) => ({ type: 'Contact' as const, id })), { type: 'Contact', id: 'LIST' }]
            : [{ type: 'Contact', id: 'LIST' }],
    }),
    addContact: builder.mutation<Contact, Partial<Contact>>({
      query: (newContact) => ({
        url: '/contacts',
        method: 'POST',
        body: newContact,
      }),
      invalidatesTags: ['Contact'],
    }),
    updateContact: builder.mutation<Contact, Partial<Contact>>({
      query: ({ id, ...patch }) => ({
        url: `/contacts/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Contact', id }, { type: 'Contact', id: 'LIST' }],
    }),
    deleteContact: builder.mutation<void, number>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Contact'],
    }),
    updateContactStatus: builder.mutation<Contact, { id: number; status: Contact['status'] }>({
        query: ({ id, status }) => ({
            url: `/contacts/${id}/status`,
            method: 'PUT',
            body: { status },
        }),
        invalidatesTags: (result, error, { id }) => [{ type: 'Contact', id }, { type: 'Contact', id: 'LIST' }],
    }),

    // Google Calendar Endpoints
    getGoogleAuthUrl: builder.query<GoogleAuthUrlResponse, void>({
        query: () => '/auth/google/redirect',
    }),
    getGoogleCalendarEvents: builder.query<GoogleCalendarEvent[], void>({
        query: () => '/google-calendar/events',
        providesTags: ['GoogleCalendarEvent'],
    }),
    createGoogleCalendarEvent: builder.mutation<GoogleCalendarEvent, CreateCalendarEventPayload>({
        query: (newEvent) => ({
            url: '/google-calendar/events',
            method: 'POST',
            body: newEvent,
        }),
        invalidatesTags: ['GoogleCalendarEvent'],
    }),
    // NOUVEAU: Mutation pour mettre à jour un événement Google Calendar
    updateGoogleCalendarEvent: builder.mutation<GoogleCalendarEvent, UpdateCalendarEventPayload>({
        query: ({ eventId, ...patch }) => ({
            url: `/google-calendar/events/${eventId}`, // Endpoint pour la mise à jour
            method: 'PUT', // Ou 'PATCH' selon votre backend
            body: patch,
        }),
        // Invalide le tag de l'événement spécifique et tous les événements pour rafraîchir le calendrier
        invalidatesTags: (result, error, { eventId }) => [{ type: 'GoogleCalendarEvent', id: eventId }, 'GoogleCalendarEvent'],
    }),
    // NOUVEAU: Mutation pour supprimer un événement Google Calendar
    deleteGoogleCalendarEvent: builder.mutation<void, string>({ // L'ID de l'événement est une chaîne
        query: (eventId) => ({
            url: `/google-calendar/events/${eventId}`, // Endpoint pour la suppression
            method: 'DELETE',
        }),
        // Invalide le tag de l'événement spécifique et tous les événements
        invalidatesTags: (result, error, eventId) => [{ type: 'GoogleCalendarEvent', id: eventId }, 'GoogleCalendarEvent'],
    }),
  }),
});

// Export RTK Query hooks for each endpoint
export const {
  useGetContactsQuery,
  useAddContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useUpdateContactStatusMutation,

  useGetGoogleAuthUrlQuery,
  useGetGoogleCalendarEventsQuery,
  useCreateGoogleCalendarEventMutation,
  useUpdateGoogleCalendarEventMutation, // EXPORTER LE NOUVEAU HOOK
  useDeleteGoogleCalendarEventMutation, // EXPORTER LE NOUVEAU HOOK
} = api;
