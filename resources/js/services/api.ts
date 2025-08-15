import { createApi, fetchBaseQuery, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { BaseQueryFn, FetchBaseQueryMeta } from '@reduxjs/toolkit/query/react';

// --- Domain Models ---
import { Contact } from '@/types/Contact';
import { GoogleCalendarEvent, CreateCalendarEventPayload } from '@/types/GoogleCalendarEvent';
import { LocalCalendarEvent, LocalEventPayload, UpdateLocalEventPayload } from '@/types/LocalCalendarEvent';
import { Company } from '@/types/Company';


// --- Types & Interfaces ---

/**
 * Extra payload used for updating a Google Calendar event.
 * Extends the create payload with eventId to target the correct event.
 */
export interface UpdateCalendarEventPayload extends CreateCalendarEventPayload {
    eventId: string; // The ID of the event to update
    // Additional flags (e.g. allDay) could be added here if needed
}

/**
 * Response shape for requesting Google OAuth authorization URL.
 */
export interface GoogleAuthUrlResponse {
    auth_url: string;
}

/**
 * Query parameters for retrieving contacts list from backend.
 * Supports pagination (page / per_page), filters, and search.
 */
export interface GetContactsQueryParams {
    page?: number;
    per_page?: number;
    search?: string;
    sort?: string;
    include?: string;
    cursor?: string;
}

/**
 * Standard backend-API paginated response format.
 * Contains data array, pagination links/meta, and optional next_cursor for cursor-based loading.
 */
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

/**
 * Utility to retrieve a cookie value by name.
 * Used mainly to extract XSRF token for Laravel Sanctum.
 */
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

// --- RTK Query API definition ---
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://127.0.0.1:8000/api',
    credentials: 'include',
    prepareHeaders: (headers) => {
      // Include XSRF token from cookies if available
      const xsrfToken = getCookie('XSRF-TOKEN');
      if (xsrfToken) {
        headers.set('X-XSRF-TOKEN', decodeURIComponent(xsrfToken));
      }
      // Laravel Axios-like defaults
      if (!headers.has('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest');
      }
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }
      return headers;
    },
  }) as BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}, FetchBaseQueryMeta>,

  // Tag types used for automatic cache invalidation
  tagTypes: ['Contact', 'Company', 'GoogleCalendarEvent', 'LocalCalendarEvent'],

  // Endpoint definitions
  endpoints: (builder) => ({

    /**
     * Get contact list with optional search, sort, include, pagination via ?page=...&per_page=...
     */
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

    /**
     * Get contacts filtered by status (e.g. "Nouveau").
     * Supports cursor-based pagination (next_cursor).
     */
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

    /** Create a new contact */
    addContact: builder.mutation<Contact, Partial<Contact>>({
      query: (newContact) => ({
        url: '/contacts',
        method: 'POST',
        body: newContact,
      }),
      invalidatesTags: ['Contact'],
    }),

    /** Update an existing contact */
    updateContact: builder.mutation<Contact, Partial<Contact>>({
      query: ({ id, ...patch }) => ({
        url: `/contacts/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Contact', id }, { type: 'Contact', id: 'LIST' }],
    }),

    /** Delete a contact by ID */
    deleteContact: builder.mutation<void, number>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Contact'],
    }),

    /** Update only the status of a contact */
    updateContactStatus: builder.mutation<Contact, { id: number; status: Contact['status'] }>({
        query: ({ id, status }) => ({
            url: `/contacts/${id}/status`,
            method: 'PUT',
            body: { status },
        }),
        invalidatesTags: (result, error, { id }) => [{ type: 'Contact', id }, { type: 'Contact', id: 'LIST' }],
    }),

    // --- Google Calendar Endpoints ---

    /** Retrieve Google OAuth URL for initiating calendar connection */
    getGoogleAuthUrl: builder.query<GoogleAuthUrlResponse, void>({
        query: () => 'google-calendar/auth/google/redirect',
    }),

    /** Retrieve all events from connected Google Calendar */
    getGoogleCalendarEvents: builder.query<GoogleCalendarEvent[], void>({
        query: () => '/google-calendar/events',
        providesTags: ['GoogleCalendarEvent'],
    }),

    /** Create a new Google Calendar event */
    createGoogleCalendarEvent: builder.mutation<GoogleCalendarEvent, CreateCalendarEventPayload>({
        query: (newEvent) => ({
            url: '/google-calendar/events',
            method: 'POST',
            body: newEvent,
        }),
        invalidatesTags: ['GoogleCalendarEvent'],
    }),

    /** Update an existing Google Calendar event */
    updateGoogleCalendarEvent: builder.mutation<GoogleCalendarEvent, UpdateCalendarEventPayload>({
        query: ({ eventId, ...patch }) => ({
            url: `/google-calendar/events/${eventId}`,
            method: 'PUT',
            body: patch,
        }),
        invalidatesTags: ['GoogleCalendarEvent'],
    }),

    /** Delete a Google Calendar event by Google eventId */
    deleteGoogleCalendarEvent: builder.mutation<void, string>({
        query: (eventId) => ({
            url: `/google-calendar/events/${eventId}`,
            method: 'DELETE',
        }),
        invalidatesTags: ['GoogleCalendarEvent'],
    }),

    /** Disconnect Google Calendar from the current user account */
    logoutGoogleCalendar: builder.mutation<void, void>({
        query: () => ({
            url: '/google-calendar/logout',
            method: 'POST',
        }),
        invalidatesTags: ['GoogleCalendarEvent'],
    }),

    // --- Local Calendar Endpoints ---

    /** Get events from local backend calendar (for non-Google mode) */
    getLocalCalendarEvents: builder.query<LocalCalendarEvent[], void>({
        query: () => '/events/local',
        providesTags: ['LocalCalendarEvent'],
    }),

    /** Create a new local calendar event */
    createLocalCalendarEvent: builder.mutation<LocalCalendarEvent, LocalEventPayload>({
        query: (payload) => ({
            url: '/events/local',
            method: 'POST',
            body: payload,
        }),
        invalidatesTags: ['LocalCalendarEvent'],
    }),

    /** Update an existing local calendar event */
    updateLocalCalendarEvent: builder.mutation<LocalCalendarEvent, UpdateLocalEventPayload>({
        query: ({ eventId, ...body }) => ({
            url: `/events/local/${eventId}`,
            method: 'PUT',
            body,
        }),
        invalidatesTags: ['LocalCalendarEvent'],
    }),

    /** Delete a local calendar event by ID */
    deleteLocalCalendarEvent: builder.mutation<void, number>({
        query: (eventId) => ({
            url: `/events/local/${eventId}`,
            method: 'DELETE',
        }),
        invalidatesTags: ['LocalCalendarEvent'],
    }),

    // ---- Company Endpoints --
    getCompanies: builder.query<PaginatedApiResponse<Company>,{ page?: number; per_page?: number; search?: string; status?: string; owner_id?: number; sort?: string }>({
        query: ({ page = 1, per_page = 15, search = '', status = '', owner_id, sort = '-created_at' }) => {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('per_page', String(per_page));
            if (search) params.append('search', search);
            if (status) params.append('status', status);
            if (typeof owner_id === 'number') params.append('owner_id', String(owner_id));
            if (sort) params.append('sort', sort);
            return { url: '/companies', params };
        },
        providesTags: (result) =>
            result
            ? [
                ...result.data.map(({ id }) => ({ type: 'Company' as const, id })),
                { type: 'Company', id: 'LIST' },
                ]
            : [{ type: 'Company', id: 'LIST' }],
    }),

    createCompany: builder.mutation<Company, Partial<Company>>({
        query: (body) => ({ url: '/companies', method: 'POST', body }),
        invalidatesTags: [{ type: 'Company', id: 'LIST' }],
    }),

    updateCompany: builder.mutation<Company, Partial<Company> & { id: number }>({
        query: ({ id, ...patch }) => ({ url: `/companies/${id}`, method: 'PUT', body: patch }),
        invalidatesTags: (result, error, { id }) => [
          { type: 'Company', id },
          { type: 'Company', id: 'LIST' },
        ],
    }),

    deleteCompany: builder.mutation<void, number>({
        query: (id) => ({ url: `/companies/${id}`, method: 'DELETE' }),
        invalidatesTags: [{ type: 'Company', id: 'LIST' }],
    }),
      
    getCompany: builder.query<Company, number>({
        query: (id) => ({ url: `/companies/${id}` }),
        providesTags: (result) => (result ? [{ type: 'Company', id: result.id }] : []),
    }),
  })
});

// --- Export generated RTK Query hooks for usage in components ---
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

  useGetCompaniesQuery,
  useGetCompanyQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
} = api;
