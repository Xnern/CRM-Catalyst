import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Contact } from '@/types/Contact';

// Query parameters for fetching contacts
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
    last_page_url: string;
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

  tagTypes: ['Contact'], // Tag types for cache invalidation and updates

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

    // Updates an existing contact
    updateContact: builder.mutation<Contact, Partial<Contact>>({
      query: ({ id, ...patch }) => ({
        url: `/contacts/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: ['Contact'], // Invalidates 'Contact' cache to refresh lists
    }),

    // Deletes a contact
    deleteContact: builder.mutation<void, number>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Contact'], // Invalidates 'Contact' cache to refresh lists
    }),
  }),
});

// Export RTK Query hooks for each endpoint
export const {
  useGetContactsQuery,
  useAddContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} = api;
