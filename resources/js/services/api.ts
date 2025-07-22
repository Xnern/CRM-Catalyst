import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../app/store'; // Assurez-vous que le chemin est correct pour votre store Redux

// Configuration de base pour fetchBaseQuery
// Important: `credentials: 'include'` pour envoyer les cookies de session (Sanctum)
const baseQuery = fetchBaseQuery({
  baseUrl: 'http://127.0.0.1:8000/api', // Adaptez à votre URL de backend Laravel
  credentials: 'include', // Inclut les cookies (nécessaire pour Sanctum)
  prepareHeaders: (headers, { getState }) => {
    // Si vous utilisez un token CSRF obtenu d'une autre manière (ex: un meta tag)
    // vous pourriez l'ajouter ici. Pour Sanctum avec cookies, ce n'est souvent pas nécessaire
    // car Axios (ou fetch avec credentials: 'include') gère automatiquement le X-XSRF-TOKEN.
    // Cependant, si vous avez des problèmes de CSRF, voici un exemple d'ajout manuel:
    // const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    // if (csrfToken) {
    //   headers.set('X-XSRF-TOKEN', csrfToken);
    // }
    return headers;
  },
});

export const contactsApi = createApi({
  reducerPath: 'contactsApi',
  baseQuery,
  tagTypes: ['Contact'], // Pour l'invalidation du cache (tags des données)
  endpoints: (builder) => ({
    // GET /api/contacts
    getContacts: builder.query<ContactPaginationResult, GetContactsQueryParams>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.per_page) queryParams.append('per_page', params.per_page.toString());
        if (params.search) queryParams.append('filter[name]', params.search); // Pour Spatie: filter[field]
        if (params.sort) queryParams.append('sort', params.sort); // Pour Spatie: sort=field ou sort=-field
        if (params.includes && params.includes.length > 0) queryParams.append('include', params.includes.join(','));

        return `contacts?${queryParams.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [...result.data.map(({ id }) => ({ type: 'Contact' as const, id })), { type: 'Contact', id: 'LIST' }]
          : [{ type: 'Contact', id: 'LIST' }],
    }),

    // GET /api/contacts/{id}
    getContactById: builder.query<Contact, number>({
      query: (id) => `contacts/${id}?include=user`, // Inclut toujours l'utilisateur pour l'affichage détaillé
      providesTags: (result, error, id) => [{ type: 'Contact', id }],
    }),

    // POST /api/contacts
    createContact: builder.mutation<Contact, Partial<Contact>>({
      query: (newContact) => ({
        url: 'contacts',
        method: 'POST',
        body: newContact,
      }),
      invalidatesTags: [{ type: 'Contact', id: 'LIST' }], // Invalide la liste après création
    }),

    // PUT/PATCH /api/contacts/{id}
    updateContact: builder.mutation<Contact, { id: number; data: Partial<Contact> }>({
      query: ({ id, data }) => ({
        url: `contacts/${id}`,
        method: 'PUT', // Ou 'PATCH' si vous utilisez PATCH dans Laravel
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Contact', id }], // Invalide le contact spécifique
    }),

    // DELETE /api/contacts/{id}
    deleteContact: builder.mutation<void, number>({
      query: (id) => ({
        url: `contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Contact', id: 'LIST' }], // Invalide la liste après suppression
    }),
  }),
});

// Exporter les hooks générés par RTK Query
export const {
  useGetContactsQuery,
  useGetContactByIdQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} = contactsApi;

// --- Typage pour les requêtes et réponses ---

// Typage pour les paramètres de requête getContacts
export interface GetContactsQueryParams {
  page?: number;
  per_page?: number;
  search?: string; // Pour le filtre 'name' (ex: filter[name]=...)
  sort?: string;   // Pour le tri (ex: sort=name ou sort=-created_at)
  includes?: string[]; // Pour les inclusions de relations (ex: ['user'])
}

// Typage pour un contact
export interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  user_id: number;
  user?: { // La relation 'user' si elle est incluse
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

// Typage pour la réponse paginée de Laravel
export interface ContactPaginationResult {
  current_page: number;
  data: Contact[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url?: string;
    label: string;
    active: boolean;
  }>;
  next_page_url?: string;
  path: string;
  per_page: number;
  prev_page_url?: string;
  to: number;
  total: number;
}
