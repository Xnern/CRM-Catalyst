import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Contact } from '@/types/Contact'; // Assurez-vous que le chemin est correct pour votre interface Contact

export interface GetContactsQueryParams {
    page?: number;       // Numéro de la page (ex: 1, 2, 3...)
    per_page?: number;   // Nombre d'éléments par page
    search?: string;     // Terme de recherche
    sort?: string;       // Champ pour le tri (ex: 'name', '-created_at')
    includes?: string[]; // Relations à inclure (ex: ['user'])
}

/**
 * Fonction utilitaire pour récupérer un cookie par son nom.
 * Utile pour récupérer le XSRF-TOKEN nécessaire à Laravel Sanctum.
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null; // S'assurer que cela fonctionne côté serveur si vous faites du SSR
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

/**
 * Création de l'API RTK Query.
 * Définit la base URL, les en-têtes communs et les points de terminaison.
 */
export const api = createApi({
  // Chemin du reducer dans le store Redux
  reducerPath: 'api',

  // Configuration de la fonction de base pour les requêtes HTTP
  baseQuery: fetchBaseQuery({
    // L'URL de base de votre API Laravel.
    // Si vos routes de contact sont dans web.php sans préfixe '/api', adaptez cette URL.
    // Exemple: 'http://127.0.0.1:8000' si vos routes sont /contacts
    // Exemple: 'http://127.0.0.1:8000/api' si vos routes sont /api/contacts
    baseUrl: 'http://127.0.0.1:8000/api',

    // Indique au navigateur d'envoyer les cookies (nécessaire pour Laravel Sanctum avec sessions)
    credentials: 'include',

    // Prépare les en-têtes de chaque requête sortante
    prepareHeaders: (headers) => {
      // Récupère le XSRF-TOKEN du cookie
      const xsrfToken = getCookie('XSRF-TOKEN');

      // Si le token est présent, l'ajoute à l'en-tête X-XSRF-TOKEN
      // Laravel Sanctum s'attend à cet en-tête pour la protection CSRF
      if (xsrfToken) {
        headers.set('X-XSRF-TOKEN', decodeURIComponent(xsrfToken));
      }

      // S'assure que Laravel reconnaît la requête comme une requête AJAX
      if (!headers.has('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest');
      }

      // S'assure que Laravel renvoie une réponse JSON
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }

      return headers;
    },
  }),

  // Définit les types de tags pour l'invalidation et la mise à jour du cache.
  // Utile pour automatiquement rafraîchir les données après une mutation.
  tagTypes: ['Contact'],

  // Définit les différents points de terminaison (endpoints) de l'API
  endpoints: (builder) => ({
    /**
     * Récupère tous les contacts.
     * @returns Un tableau d'objets Contact.
     */
    getContacts: builder.query<{ data: Contact[]; total: number; last_page: number; }, GetContactsQueryParams>({
        query: (queryParams) => ({
            url: '/contacts', // ou '/api/contacts'
            params: queryParams,
        }),
    }),

    /**
     * Ajoute un nouveau contact.
     * @param newContact Les données du nouveau contact à créer.
     * @returns Le contact créé (avec son ID, timestamps, etc.).
     */
    addContact: builder.mutation<Contact, Partial<Contact>>({
      query: (newContact) => ({
        url: '/contacts', // Assurez-vous que le chemin correspond à votre route
        method: 'POST',
        body: newContact,
      }),
      invalidatesTags: ['Contact'], // Invalide le cache 'Contact' pour rafraîchir la liste
    }),

    /**
     * Met à jour un contact existant.
     * @param id L'ID du contact à mettre à jour.
     * @param patch Les champs à modifier du contact.
     * @returns Le contact mis à jour.
     */
    updateContact: builder.mutation<Contact, Partial<Contact>>({
      query: ({ id, ...patch }) => ({
        url: `/contacts/${id}`, // Assurez-vous que le chemin correspond à votre route
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: ['Contact'], // Invalide le cache 'Contact' pour rafraîchir la liste
    }),

    /**
     * Supprime un contact.
     * @param id L'ID du contact à supprimer.
     */
    deleteContact: builder.mutation<void, number>({
      query: (id) => ({
        url: `/contacts/${id}`, // Assurez-vous que le chemin correspond à votre route
        method: 'DELETE',
      }),
      invalidatesTags: ['Contact'], // Invalide le cache 'Contact' pour rafraîchir la liste
    }),
  }),
});

/**
 * Exporte les hooks générés par RTK Query pour chaque endpoint.
 * Utilisez-les dans vos composants React (e.g., useGetContactsQuery()).
 */
export const {
  useGetContactsQuery,
  useAddContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} = api;
