// src/services/api.ts

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Définition des types pour les données de contact
export interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  user_id: number;
  user?: { // Relation user incluse
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

// Type pour la réponse paginée de l'API
export interface ContactsApiResponse {
  data: Contact[];
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
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

// Types pour les paramètres de requête (pagination, tri, recherche)
export interface GetContactsQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string; // ex: 'name', '-created_at'
  includes?: string[]; // ex: ['user']
}

// Types pour les données de création/modification de contact
export interface CreateContactPayload {
  name: string;
  email?: string;
  phone?: string;
}

export interface UpdateContactPayload extends CreateContactPayload {
  id: number; // L'ID est requis pour la modification
}

// Fonction utilitaire pour lire un cookie
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

// Configuration de la base de requête
const baseQuery = fetchBaseQuery({
  // ATTENTION: Assurez-vous que cette URL correspond exactement à celle de votre serveur Laravel
  // et que vous utilisez cette même URL pour accéder à votre application dans le navigateur.
  baseUrl: 'http://127.0.0.1:8000/api',
  credentials: 'include', // Important pour envoyer les cookies d'authentification (Sanctum)
  prepareHeaders: (headers) => {
    // Tente de récupérer le jeton XSRF-TOKEN depuis les cookies
    const xsrfToken = getCookie('XSRF-TOKEN');

    // Si le jeton existe et n'est pas déjà dans les en-têtes, ajoutez-le.
    // Il est essentiel pour les requêtes POST, PUT, PATCH, DELETE afin de prévenir les attaques CSRF.
    if (xsrfToken && !headers.has('X-XSRF-TOKEN')) {
      headers.set('X-XSRF-TOKEN', decodeURIComponent(xsrfToken)); // Décode le token si nécessaire
    }

    return headers;
  },
});

// Création de l'API RTK Query
export const contactsApi = createApi({
  reducerPath: 'contactsApi', // Nom du reducer dans le store
  baseQuery: baseQuery,
  tagTypes: ['Contact'], // Types de tags pour l'invalidation du cache

  endpoints: (builder) => ({
    // Endpoint pour récupérer les contacts (GET)
    getContacts: builder.query<ContactsApiResponse, GetContactsQueryParams>({
      query: (params) => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.per_page) query.append('per_page', params.per_page.toString());
        if (params.search) query.append('filter[name]', params.search); // Utilise filter[name] pour Spatie Query Builder
        if (params.sort) query.append('sort', params.sort);
        if (params.includes && params.includes.length > 0) query.append('include', params.includes.join(','));

        return {
          url: `/contacts?${query.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result) =>
        result
          ? [...result.data.map(({ id }) => ({ type: 'Contact' as const, id })), { type: 'Contact', id: 'LIST' }]
          : [{ type: 'Contact', id: 'LIST' }],
    }),

    // Endpoint pour créer un contact (POST)
    createContact: builder.mutation<Contact, CreateContactPayload>({
      query: (newContact) => ({
        url: '/contacts',
        method: 'POST',
        body: newContact,
      }),
      invalidatesTags: [{ type: 'Contact', id: 'LIST' }], // Invalide la liste des contacts après création
    }),

    // Endpoint pour modifier un contact (PUT/PATCH)
    updateContact: builder.mutation<Contact, UpdateContactPayload>({
      query: ({ id, ...patch }) => ({
        url: `/contacts/${id}`,
        method: 'PUT', // Ou 'PATCH' selon votre backend Laravel
        body: patch,
      }),
      // Invalide le contact spécifique et la liste pour s'assurer que les changements sont visibles
      invalidatesTags: (result, error, { id }) => [{ type: 'Contact', id }, { type: 'Contact', id: 'LIST' }],
    }),

    // Endpoint pour supprimer un contact (DELETE)
    deleteContact: builder.mutation<void, number>({ // Le type de retour est 'void' car pas de corps de réponse attendu
      query: (id) => ({
        url: `/contacts/${id}`,
        method: 'DELETE',
      }),
      // Invalide le contact spécifique et la liste après suppression
      invalidatesTags: (result, error, id) => [{ type: 'Contact', id }, { type: 'Contact', id: 'LIST' }],
    }),
  }),
});

// Export des hooks générés par RTK Query pour chaque endpoint
export const {
  useGetContactsQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} = contactsApi;
