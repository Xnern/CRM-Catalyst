// resources/js/services/api.ts

import { createApi, fetchBaseQuery, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { BaseQueryFn, FetchBaseQueryMeta } from '@reduxjs/toolkit/query/react';

// Imports corrigés
import { Contact } from '@/types/Contact';
import { GoogleCalendarEvent, CreateCalendarEventPayload } from '@/types/GoogleCalendarEvent';
import { LocalCalendarEvent, LocalEventPayload, UpdateLocalEventPayload } from '@/types/LocalCalendarEvent';

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
    cursor?: string;
}

export interface PaginatedApiResponse<T> {
    data: T[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        from: number;
        last_page: number;
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
        path: string;
        per_page: number;
        to: number;
        total: number;
    };
    next_cursor?: string;
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
  }) as BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}, FetchBaseQueryMeta>,
  tagTypes: ['Contact', 'GoogleCalendarEvent', 'LocalCalendarEvent'],
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
    getContactsByStatus: builder.query<PaginatedApiResponse<Contact>, { status: Contact['status']; per_page?: number; cursor?: string }>({
        query: ({ status, per_page = 15, cursor }) => {
            const params = new URLSearchParams();
            params.append('per_page', per_page.toString());
            if (cursor) {
                params.append('cursor', cursor);
            }

            return {
                url: `/contacts/by-status/${status}`,
                params: params,
            };
        },
        providesTags: (result, error, { status }) =>
            result
                ? [
                    ...result.data.map(({ id }) => ({ type: 'Contact' as const, id })),
                    { type: 'Contact', id: 'LIST', status },
                ]
                : [{ type: 'Contact', id: 'LIST', status }],
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
        query: () => 'google-calendar/auth/google/redirect',
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
    updateGoogleCalendarEvent: builder.mutation<GoogleCalendarEvent, UpdateCalendarEventPayload>({
        query: ({ eventId, ...patch }) => ({
            url: `/google-calendar/events/${eventId}`,
            method: 'PUT',
            body: patch,
        }),
        invalidatesTags: ['GoogleCalendarEvent'],
    }),
    deleteGoogleCalendarEvent: builder.mutation<void, string>({
        query: (eventId) => ({
            url: `/google-calendar/events/${eventId}`,
            method: 'DELETE',
        }),
        invalidatesTags: ['GoogleCalendarEvent'],
    }),
    logoutGoogleCalendar: builder.mutation<void, void>({
        query: () => ({
            url: '/google-calendar/logout',
            method: 'POST',
        }),
        invalidatesTags: ['GoogleCalendarEvent'],
    }),

    // Endpoints pour les événements locaux
    getLocalCalendarEvents: builder.query<LocalCalendarEvent[], void>({
        query: () => '/events/local',
        providesTags: ['LocalCalendarEvent'],
    }),
    createLocalCalendarEvent: builder.mutation<LocalCalendarEvent, LocalEventPayload>({
        query: (payload) => ({
            url: '/events/local',
            method: 'POST',
            body: payload,
        }),
        invalidatesTags: ['LocalCalendarEvent'],
    }),
    updateLocalCalendarEvent: builder.mutation<LocalCalendarEvent, UpdateLocalEventPayload>({
        query: ({ eventId, ...body }) => ({
            url: `/events/local/${eventId}`,
            method: 'PUT',
            body,
        }),
        invalidatesTags: ['LocalCalendarEvent'],
    }),
    deleteLocalCalendarEvent: builder.mutation<void, number>({
        query: (eventId) => ({
            url: `/events/local/${eventId}`,
            method: 'DELETE',
        }),
        invalidatesTags: ['LocalCalendarEvent'],
    }),
  }),
});

// Export RTK Query hooks for each endpoint
export const {
  useGetContactsQuery,
  useGetContactsByStatusQuery,
  useLazyGetContactsQuery,
  useAddContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useUpdateContactStatusMutation,

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
} = api;
