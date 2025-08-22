import { createApi, fetchBaseQuery, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchBaseQueryMeta } from '@reduxjs/toolkit/query/react';

// --- Domain Models (types only) ---
import type { Contact } from '@/types/Contact';
import type { Company, CompanyStatusOptionsResponse } from '@/types/Company';
import type { Document as DocumentModel } from '@/types/Document';
import type { PaginatedApiResponse } from '@/types/PaginatedApiResponse';

// CRM Settings types
import type {
  CrmSettings,
  CrmSettingsResponse,
  CrmSettingsUpdateResponse,
  CrmSettingUpdatePayload,
  PublicCrmSettingsResponse
} from '@/types/CrmSettings';

// Calendar events types
import type { GoogleCalendarEvent, CreateCalendarEventPayload } from '@/types/GoogleCalendarEvent';
import type { LocalCalendarEvent, LocalEventPayload, UpdateLocalEventPayload } from '@/types/LocalCalendarEvent';

// --- Local Types & Interfaces (propres à ce fichier uniquement) ---

export interface UpdateCalendarEventPayload extends CreateCalendarEventPayload {
  eventId: string;
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

// Documents link payloads (spécifiques aux endpoints)
export type DocumentLinkType = 'company' | 'contact';

export interface DocumentLinkPayload {
  type: DocumentLinkType;
  id: number;
  role?: string;
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  version: number;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Dashboard types
export interface DashboardStats {
  total_contacts: number;
  total_companies: number;
  total_documents: number;
  total_events: number;
  contacts_this_month: number;
  companies_this_month: number;
}

export interface StatusData {
  name: string;
  value: number;
  status: string;
}

export interface TimelineData {
  month: string;
  contacts?: number;
  documents?: number;
}

export interface RecentActivity {
  type: 'contact' | 'company' | 'document';
  title: string;
  date: string;
  id: number;
}

// --- Utils ---
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

  // Tag types
  tagTypes: [
    'Contact',
    'Company',
    'GoogleCalendarEvent',
    'LocalCalendarEvent',
    'CompanyContacts',
    'UnassignedContacts',
    'Document',
    'Dashboard',
    'CrmSettings', // ✅ New tag for CRM Settings
  ],

  // Endpoints
  endpoints: (builder) => ({
    /**
     * ✅ CRM SETTINGS ENDPOINTS
     */
    getCrmSettings: builder.query<CrmSettingsResponse, void>({
      query: () => '/settings',
      providesTags: ['CrmSettings'],
    }),

    getPublicCrmSettings: builder.query<PublicCrmSettingsResponse, void>({
      query: () => '/settings/public',
      providesTags: ['CrmSettings'],
    }),

    updateCrmSettings: builder.mutation<CrmSettingsUpdateResponse, Partial<CrmSettings>>({
      query: (settings) => ({
        url: '/settings',
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: ['CrmSettings'],
    }),

    updateSingleCrmSetting: builder.mutation<
      { success: boolean; message: string; data: { key: string; value: any; category: string } },
      CrmSettingUpdatePayload
    >({
      query: (setting) => ({
        url: '/settings/single',
        method: 'POST',
        body: setting,
      }),
      invalidatesTags: ['CrmSettings'],
    }),

    resetCrmSettings: builder.mutation<CrmSettingsUpdateResponse, void>({
      query: () => ({
        url: '/settings/reset',
        method: 'POST',
      }),
      invalidatesTags: ['CrmSettings'],
    }),

    /**
     * Dashboard Analytics
     */
    getDashboardStats: builder.query<{ data: DashboardStats }, void>({
      query: () => '/dashboard/stats',
      providesTags: ['Dashboard'],
    }),

    getCompaniesByStatusApi: builder.query<{ data: StatusData[] }, void>({
      query: () => '/dashboard/companies-by-status',
      providesTags: ['Dashboard'],
    }),

    getContactsTimelineApi: builder.query<{ data: TimelineData[] }, number>({
      query: (months = 6) => `/dashboard/contacts-timeline?months=${months}`,
      providesTags: ['Dashboard'],
    }),

    getDocumentsTimelineApi: builder.query<{ data: TimelineData[] }, number>({
      query: (months = 6) => `/dashboard/documents-timeline?months=${months}`,
      providesTags: ['Dashboard'],
    }),

    getRecentActivitiesApi: builder.query<{ data: RecentActivity[] }, number>({
      query: (limit = 10) => `/dashboard/recent-activities?limit=${limit}`,
      providesTags: ['Dashboard'],
    }),

    getOpportunitiesByStageApi: builder.query<{ data: Array<{ name: string; count: number; amount: number; stage: string }> }, void>({
      query: () => '/dashboard/opportunities-by-stage',
      providesTags: ['Dashboard'],
    }),

    /**
     * Contacts - Routes génériques CRUD (à utiliser partout)
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

    addContact: builder.mutation<Contact, Partial<Contact>>({
      query: (newContact) => ({
        url: '/contacts',
        method: 'POST',
        body: newContact,
      }),
      invalidatesTags: (result, _error, arg) => {
        const tags = [
          { type: 'Contact' as const, id: 'LIST' },
          { type: 'UnassignedContacts' as const, id: 'LIST' },
          { type: 'Dashboard' as const },
        ];
        if (arg.company_id) {
          tags.push({ type: 'CompanyContacts' as const, id: arg.company_id });
        }
        return tags;
      },
    }),

    updateContact: builder.mutation<Contact, Partial<Contact> & { id: number }>({
      query: ({ id, ...patch }) => ({
        url: `/contacts/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, _error, { id, company_id }) => {
        const tags = [
          { type: 'Contact' as const, id },
          { type: 'Contact' as const, id: 'LIST' },
          { type: 'UnassignedContacts' as const, id: 'LIST' },
          { type: 'Dashboard' as const },
        ];
        if (company_id) {
          tags.push({ type: 'CompanyContacts' as const, id: company_id });
        }
        return tags;
      },
    }),

    deleteContact: builder.mutation<void, number>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Contact', id: 'LIST' },
        { type: 'UnassignedContacts', id: 'LIST' },
        { type: 'Dashboard' },
      ],
    }),

    searchContacts: builder.query<{ id: number; name: string }[], string>({
      query: (q) => ({ url: '/contacts/search', params: { q } }),
    }),

    // CONTACTS - get a single contact
    getContact: builder.query<Contact, number>({
      query: (id) => ({ url: `/contacts/${id}` }),
      providesTags: (_res, _err, id) => [{ type: 'Contact', id }],
    }),

    /**
     * Google Calendar
     */
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

    /**
     * Local Calendar
     */
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

    /**
     * Companies
     */
    getCompanies: builder.query<
      PaginatedApiResponse<Company>,
      { page?: number; per_page?: number; search?: string; status?: string; owner_id?: number; sort?: string }
    >({
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
      invalidatesTags: [{ type: 'Company', id: 'LIST' }, { type: 'Dashboard' }],
    }),

    updateCompany: builder.mutation<Company, Partial<Company> & { id: number }>({
      query: ({ id, ...patch }) => ({ url: `/companies/${id}`, method: 'PUT', body: patch }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Company', id },
        { type: 'Company', id: 'LIST' },
        { type: 'Dashboard' },
      ],
    }),

    deleteCompany: builder.mutation<void, number>({
      query: (id) => ({ url: `/companies/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Company', id: 'LIST' }, { type: 'Dashboard' }],
    }),

    getCompany: builder.query<Company, number>({
      query: (id) => ({ url: `/companies/${id}` }),
      providesTags: (result) => (result ? [{ type: 'Company', id: result.id }] : []),
    }),

    getCompanyStatusOptions: builder.query<CompanyStatusOptionsResponse, void>({
      query: () => ({
        url: '/meta/company-statuses',
        method: 'GET',
      }),
    }),

    searchCompanies: builder.query<{ id: number; name: string }[], string>({
      query: (q) => ({ url: '/companies/search', params: { q } }),
    }),

    getCompanyByStatus: builder.query<PaginatedApiResponse<Company>, { status: string; per_page?: number; cursor?: string }>({
        query: ({ status, per_page = 15, cursor }) => {
            const params = new URLSearchParams();
            params.append('per_page', per_page.toString());
            if (cursor) {
            params.append('cursor', cursor);
            }
            return {
            url: `/companies/by-status/${status}`,
            params: params,
            };
        },
        providesTags: (result, _error, { status }) =>
            result
            ? [
                ...result.data.map(({ id }) => ({ type: 'Company' as const, id })),
                { type: 'Company', id: 'LIST', status },
                ]
            : [{ type: 'Company', id: 'LIST', status }],
        }),

    /**
     * Company-Contact Relations (seulement les opérations spécifiques aux relations)
     */
    getCompanyContacts: builder.query<any, { companyId: number; page?: number; per_page?: number; search?: string }>({
      query: ({ companyId, page = 1, per_page = 10, search = '' }) =>
        `/companies/${companyId}/contacts?page=${page}&per_page=${per_page}&search=${encodeURIComponent(search)}`,
      providesTags: (_res, _err, arg) => [{ type: 'CompanyContacts', id: arg.companyId }],
    }),

    getUnassignedContacts: builder.query<
      PaginatedApiResponse<Contact>,
      { page?: number; per_page?: number; search?: string; includeAssigned?: boolean }
    >({
      query: ({ page = 1, per_page = 10, search = '', includeAssigned = false }) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('per_page', String(per_page));
        params.set('scope', includeAssigned ? 'all' : 'unassigned');
        if (search) params.set('search', search);
        return `/contacts?${params.toString()}`;
      },
      providesTags: [{ type: 'UnassignedContacts', id: 'LIST' }],
    }),

    attachCompanyContact: builder.mutation<
      { attached: true; contact: Contact },
      { companyId: number; contactId: number }
    >({
      query: ({ companyId, contactId }) => ({
        url: `/companies/${companyId}/contacts/attach`,
        method: 'POST',
        body: { contact_id: contactId },
      }),
      invalidatesTags: (result, _error, arg) => [
        { type: 'CompanyContacts', id: arg.companyId },
        { type: 'UnassignedContacts', id: 'LIST' },
        { type: 'Company', id: arg.companyId },
        { type: 'Contact', id: arg.contactId },
        { type: 'Contact', id: 'LIST' },
      ],
    }),

    detachCompanyContact: builder.mutation<
      { detached: true },
      { companyId: number; contactId: number }
    >({
      query: ({ companyId, contactId }) => ({
        url: `/companies/${companyId}/contacts/${contactId}/detach`,
        method: 'POST',
      }),
      invalidatesTags: (result, _error, arg) => [
        { type: 'CompanyContacts', id: arg.companyId },
        { type: 'UnassignedContacts', id: 'LIST' },
        { type: 'Company', id: arg.companyId },
        { type: 'Contact', id: arg.contactId },
        { type: 'Contact', id: 'LIST' },
      ],
    }),

    /**
     * Documents
     */
    getDocuments: builder.query<
      PaginatedApiResponse<DocumentModel>,
      {
        page?: number;
        per_page?: number;
        search?: string;
        tag?: string;
        type?: string; // mime prefix or extension
        company_id?: number;
        contact_id?: number;
        owner_id?: number;
        sort?: string; // e.g., -created_at
      }
    >({
      query: (paramsObj = {}) => {
        const {
          page = 1,
          per_page = 15,
          search,
          tag,
          type,
          company_id,
          contact_id,
          owner_id,
          sort = '-created_at',
        } = paramsObj;

        const params = new URLSearchParams();
        params.append('page', String(page));
        params.append('per_page', String(per_page));
        if (search) params.append('search', search);
        if (tag) params.append('tag', tag);
        if (type) params.append('type', type);
        if (typeof company_id === 'number') params.append('company_id', String(company_id));
        if (typeof contact_id === 'number') params.append('contact_id', String(contact_id));
        if (typeof owner_id === 'number') params.append('owner_id', String(owner_id));
        if (sort) params.append('sort', sort);

        return { url: '/documents', params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((d) => ({ type: 'Document' as const, id: d.id })),
              { type: 'Document' as const, id: 'LIST' },
            ]
          : [{ type: 'Document' as const, id: 'LIST' }],
    }),

    getCompanyDocuments: builder.query<
      PaginatedApiResponse<DocumentModel>,
      { company_id: number; page?: number; per_page?: number; search?: string; tag?: string; type?: string; sort?: string }
    >({
      query: ({ company_id, page = 1, per_page = 15, search, tag, type, sort = '-created_at' }) => {
        const params = new URLSearchParams();
        params.append('company_id', String(company_id));
        params.append('page', String(page));
        params.append('per_page', String(per_page));
        if (search) params.append('search', search);
        if (tag) params.append('tag', tag);
        if (type) params.append('type', type);
        if (sort) params.append('sort', sort);
        return { url: '/documents', params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((d) => ({ type: 'Document' as const, id: d.id })),
              { type: 'Document', id: 'LIST' },
            ]
          : [{ type: 'Document', id: 'LIST' }],
    }),

    getDocument: builder.query<DocumentModel, number>({
      query: (id) => ({ url: `/documents/${id}` }),
      providesTags: (_res, _err, id) => [{ type: 'Document', id }],
    }),

    uploadDocument: builder.mutation<DocumentModel, FormData>({
      query: (formData) => ({
        url: '/documents',
        method: 'POST',
        body: formData, // Do not set content-type; browser sets multipart boundary
      }),
      invalidatesTags: [{ type: 'Document', id: 'LIST' }, { type: 'Dashboard' }],
    }),

    updateDocument: builder.mutation<DocumentModel, { id: number; data: Partial<Pick<DocumentModel, 'name' | 'description' | 'visibility' | 'tags'>> }>({
      query: ({ id, data }) => ({
        url: `/documents/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Document', id }, { type: 'Document', id: 'LIST' }],
    }),

    deleteDocument: builder.mutation<{ status: string }, { id: number; hard?: boolean }>({
      query: ({ id, hard }) => ({
        url: `/documents/${id}`,
        method: 'DELETE',
        params: { hard_delete: hard ? 'true' : 'false' },
      }),
      invalidatesTags: [{ type: 'Document', id: 'LIST' }, { type: 'Dashboard' }],
    }),

    downloadDocument: builder.query<{ url?: string }, number>({
      query: (id) => ({ url: `/documents/${id}/download` }),
    }),

    linkDocument: builder.mutation<DocumentModel, { id: number; payload: DocumentLinkPayload }>({
      query: ({ id, payload }) => ({
        url: `/documents/${id}/links`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Document', id }],
    }),

    unlinkDocument: builder.mutation<DocumentModel, { id: number; payload: { type: DocumentLinkType; id: number } }>({
      query: ({ id, payload }) => ({
        url: `/documents/${id}/unlinks`,
        method: 'DELETE',
        body: payload as any, // fetchBaseQuery supports body in DELETE
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Document', id }],
    }),

    listDocumentVersions: builder.query<DocumentVersion[], number>({
      query: (id) => ({ url: `/documents/${id}/versions` }),
      providesTags: (_res, _err, id) => [{ type: 'Document', id }],
    }),

    uploadDocumentVersion: builder.mutation<
      { version: number; document: DocumentModel },
      { id: number; file: File }
    >({
      query: ({ id, file }) => {
        const form = new FormData();
        form.append('file', file);
        return {
          url: `/documents/${id}/versions`,
          method: 'POST',
          body: form,
        };
      },
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Document', id }, { type: 'Document', id: 'LIST' }],
    }),

    // DOCUMENTS - list by contact_id
    getContactDocuments: builder.query<
      PaginatedApiResponse<DocumentModel>,
      { contact_id: number; page?: number; per_page?: number; search?: string; tag?: string; type?: string; sort?: string }
    >({
      query: ({ contact_id, page = 1, per_page = 15, search, tag, type, sort = '-created_at' }) => {
        const params = new URLSearchParams();
        params.append('contact_id', String(contact_id));
        params.append('page', String(page));
        params.append('per_page', String(per_page));
        if (search) params.append('search', search);
        if (tag) params.append('tag', tag);
        if (type) params.append('type', type);
        if (sort) params.append('sort', sort);
        return { url: '/documents', params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((d) => ({ type: 'Document' as const, id: d.id })),
              { type: 'Document' as const, id: 'LIST' },
            ]
          : [{ type: 'Document' as const, id: 'LIST' }],
    }),

    // DOCUMENTS - unlink document from contact
    unlinkDocumentFromContact: builder.mutation<
      DocumentModel,
      { id: number; contactId: number }
    >({
      query: ({ id, contactId }) => ({
        url: `/documents/${id}/unlinks`,
        method: 'DELETE',
        body: { type: 'contact', id: contactId } as any,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Document', id }, { type: 'Document', id: 'LIST' }],
    }),
  }),
});

// --- Export generated RTK Query hooks for usage in components ---
export const {
  // ✅ CRM Settings hooks
  useGetCrmSettingsQuery,
  useGetPublicCrmSettingsQuery,
  useUpdateCrmSettingsMutation,
  useUpdateSingleCrmSettingMutation,
  useResetCrmSettingsMutation,

  // Dashboard
  useGetDashboardStatsQuery,
  useGetCompaniesByStatusApiQuery,
  useGetContactsTimelineApiQuery,
  useGetDocumentsTimelineApiQuery,
  useGetRecentActivitiesApiQuery,
  useGetOpportunitiesByStageApiQuery,

  // Contacts - Routes génériques (à utiliser partout)
  useGetContactsQuery,
  useLazyGetContactsQuery,
  useAddContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useGetContactQuery,

  // Google Calendar
  useGetGoogleAuthUrlQuery,
  useGetGoogleCalendarEventsQuery,
  useCreateGoogleCalendarEventMutation,
  useUpdateGoogleCalendarEventMutation,
  useDeleteGoogleCalendarEventMutation,
  useLogoutGoogleCalendarMutation,

  // Local Calendar
  useGetLocalCalendarEventsQuery,
  useCreateLocalCalendarEventMutation,
  useUpdateLocalCalendarEventMutation,
  useDeleteLocalCalendarEventMutation,

  // Companies
  useGetCompaniesQuery,
  useGetCompanyQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
  useGetCompanyStatusOptionsQuery,
  useSearchCompaniesQuery,
  useLazySearchCompaniesQuery,
  useGetCompanyByStatusQuery,

  // Company-Contact Relations (seulement les opérations spécifiques)
  useGetCompanyContactsQuery,
  useGetUnassignedContactsQuery,
  useAttachCompanyContactMutation,
  useDetachCompanyContactMutation,

  // Documents
  useGetDocumentsQuery,
  useGetCompanyDocumentsQuery,
  useLazyGetCompanyDocumentsQuery,
  useGetDocumentQuery,
  useUploadDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useDownloadDocumentQuery,
  useLinkDocumentMutation,
  useUnlinkDocumentMutation,
  useListDocumentVersionsQuery,
  useUploadDocumentVersionMutation,
  useGetContactDocumentsQuery,
  useUnlinkDocumentFromContactMutation,

  // Search
  useSearchContactsQuery,
  useLazySearchContactsQuery,
} = api;

