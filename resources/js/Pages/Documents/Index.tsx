import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useAppSettings } from '@/hooks/useAppSettings';

import {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useLinkDocumentMutation,
  useUnlinkDocumentMutation,
  useLazySearchCompaniesQuery,
  useLazySearchContactsQuery,
} from '@/services/api';

import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/Components/ui/select';
import { Card, CardContent } from '@/Components/ui/card';
import { UploadModal } from '@/Components/Documents/UploadModal';
import { DocumentDetailsModal } from '@/Components/Documents/DocumentDetailsModal';
import type { Document } from '@/types/Document';

import {
  FileText, Search, Plus, Trash2, Eye, Loader2, Download, MoreVertical,
  Tag as TagIcon,
} from 'lucide-react';

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator
} from '@/Components/ui/dropdown-menu';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/Components/ui/alert-dialog';

import { toast } from 'sonner';

// Component props interface
type Props = { auth: any };

/**
 * Format bytes to human-readable file size
 */
const formatBytes = (n: number) => {
  if (!n) return '0B';
  const u = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(1)}${u[i]}`;
};

/**
 * Get CSS classes for document visibility badge
 */
const badgeForVisibility = (v: Document['visibility']) => {
  switch (v) {
    case 'private': return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300';
    case 'team': return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200';
    case 'company': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200';
    default: return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300';
  }
};

/**
 * Get appropriate icon for file extension
 */
const iconForExtension = (ext?: string | null) => {
  const e = (ext || '').toLowerCase();
  if (e === 'pdf') return <FileText className="h-4 w-4 text-red-600" />;
  if (['doc', 'docx'].includes(e)) return <FileText className="h-4 w-4 text-blue-600" />;
  if (['xls', 'xlsx', 'csv'].includes(e)) return <FileText className="h-4 w-4 text-green-600" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e)) return <FileText className="h-4 w-4 text-purple-600" />;
  return <FileText className="h-4 w-4 text-gray-600" />;
};

/**
 * Documents Index Page Component with optimized caching and real-time updates
 */
export default function DocumentsIndex({ auth }: Props) {
  // Initialize CSRF token on component mount
  useEffect(() => {
    fetch('/sanctum/csrf-cookie', { credentials: 'include' }).catch(() => {});
  }, []);

  // Filter states
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [sort, setSort] = useState('-created_at');

  const [openUpload, setOpenUpload] = useState(false);

  // Document details modal states
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsDoc, setDetailsDoc] = useState<Document | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Deletion confirmation states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  // ✅ OPTIMIZATIONS: Cache and request management
  const documentCache = useRef(new Map<number, Document>());
  const fetchingDocs = useRef(new Set<number>());
  const abortControllers = useRef(new Map<number, AbortController>());

  // Query parameters for API requests
  const queryParams = useMemo(() => ({
    page, per_page: perPage,
    search: search || undefined,
    type: type || undefined,
    tag: tag || undefined,
    sort,
  }), [page, perPage, search, type, tag, sort]);

  // Documents list query
  const { data: list, isLoading, isFetching, refetch } = useGetDocumentsQuery(queryParams);
  const items: Document[] = (list as any)?.data ?? [];
  const currentPage = (list as any)?.meta?.current_page ?? page;
  const total = (list as any)?.meta?.total ?? items.length;
  const lastPage = (list as any)?.meta?.last_page ?? 1;
  const isDataLoading = isLoading || isFetching;

  // ✅ Optimized URL parameter handling
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');

    if (docId && !detailsOpen) {
      const numericId = parseInt(docId);

      // 1. Check cache first
      const cachedDoc = documentCache.current.get(numericId);
      if (cachedDoc) {
        console.log('📋 Document found in cache');
        setDetailsDoc(cachedDoc);
        setDetailsOpen(true);
        setIsLoadingDetails(false);
        return;
      }

      // 2. Search in existing data
      if (items.length > 0) {
        const existingDoc = items.find(item => item.id === numericId);
        if (existingDoc) {
          console.log('📄 Document found in list');
          openDetails(existingDoc);
          return;
        }
      }

      // 3. Create minimal document + fetch if necessary
      console.log('⏳ Loading document directly');
      const minimalDoc: Document = {
        id: numericId,
        name: 'Loading...',
        description: '',
        visibility: 'private',
        original_filename: '',
        mime_type: '',
        extension: '',
        size_bytes: 0,
        created_at: '',
        updated_at: '',
        owner: null,
        companies: [],
        contacts: [],
        tags: []
      };

      openDetails(minimalDoc);
    }
  }, [items, detailsOpen]);

  // API mutations
  const [uploadDocument] = useUploadDocumentMutation();
  const [updateDocument] = useUpdateDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();
  const [linkDocument] = useLinkDocumentMutation();
  const [unlinkDocument] = useUnlinkDocumentMutation();

  // Lazy search queries
  const [triggerCompanies] = useLazySearchCompaniesQuery();
  const [triggerContacts] = useLazySearchContactsQuery();

  /**
   * Search companies with debouncing and error handling
   */
  const searchCompanies = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) return [];
    try {
      const res: any = await triggerCompanies(q).unwrap();
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }, [triggerCompanies]);

  /**
   * Search contacts with debouncing and error handling
   */
  const searchContacts = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) return [];
    try {
      const res: any = await triggerContacts(q).unwrap();
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }, [triggerContacts]);

  // Upload modal handlers
  const openUploadModal = () => setOpenUpload(true);
  const closeUploadModal = () => setOpenUpload(false);
  const onUploaded = () => { toast.success('Document imported.'); refetch(); };

  // URL management functions
  const addDocIdToUrl = (docId: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('id', docId.toString());
    window.history.replaceState({}, '', url.toString());
  };

  const removeDocIdFromUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url.toString());
  };

  // ✅ OPTIMIZED FUNCTION: openDetails with caching and abort controllers
  const openDetails = useCallback(async (d: Document) => {
    if (!d?.id) return;

    console.log('🔍 Opening details for:', d.name);

    // 1. Check cache first
    const cachedDoc = documentCache.current.get(d.id);
    if (cachedDoc && cachedDoc.companies !== undefined && cachedDoc.contacts !== undefined) {
      console.log('📋 Using cache');
      addDocIdToUrl(d.id);
      setDetailsDoc(cachedDoc);
      setDetailsOpen(true);
      setIsLoadingDetails(false);
      return;
    }

    // 2. If already fetching, ignore
    if (fetchingDocs.current.has(d.id)) {
      console.log('⚠️ Fetch already in progress');
      return;
    }

    // 3. Cancel any previous request for this document
    const existingController = abortControllers.current.get(d.id);
    if (existingController) {
      existingController.abort();
    }

    // 4. Open modal immediately
    addDocIdToUrl(d.id);
    setDetailsDoc(d);
    setDetailsOpen(true);

    // 5. Check if we already have complete data
    const hasCompleteData = d.companies !== undefined && d.contacts !== undefined;
    if (hasCompleteData) {
      console.log('✅ Data already complete');
      documentCache.current.set(d.id, d);
      setIsLoadingDetails(false);
      return;
    }

    // 6. Fetch complete data
    console.log('⏳ Loading complete data...');
    fetchingDocs.current.add(d.id);
    setIsLoadingDetails(true);

    const controller = new AbortController();
    abortControllers.current.set(d.id, controller);

    try {
      const resp = await fetch(`/api/documents/${d.id}?include=companies,contacts`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });

      if (resp.ok) {
        const json = await resp.json();
        const fullDoc = (json && json.data) ? json.data : json;

        console.log('✅ Complete document received');

        // Save to cache
        documentCache.current.set(d.id, fullDoc);
        setDetailsDoc(fullDoc);
      } else {
        console.error('❌ Error during loading:', resp.status);
        toast.error('Error loading document details');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🚫 Request cancelled');
        return;
      }
      console.error('❌ Fetch error:', error);
      toast.error('Error loading document details');
    } finally {
      fetchingDocs.current.delete(d.id);
      abortControllers.current.delete(d.id);
      setIsLoadingDetails(false);
    }
  }, []);

  /**
   * Close document details modal and clean up URL
   */
  const closeDetails = () => {
    console.log('🔒 Closing details');
    setDetailsOpen(false);
    setDetailsDoc(null);
    setIsLoadingDetails(false);
    removeDocIdFromUrl();
  };

  /**
   * Download document with fallback handling
   */
  const download = async (d: Document) => {
    if (!d?.id) return;
    try {
      const resp = await fetch(`/api/documents/${d.id}/download`, { credentials: 'include' });
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await resp.json();
        if (json?.url) {
          window.open(json.url, '_blank');
          return;
        }
      }
      window.open(`/api/documents/${d.id}/download`, '_blank');
    } catch {
      toast.error('Download failed.');
    }
  };

  /**
   * Request document deletion confirmation
   */
  const requestDeletion = (doc: Document) => {
    setDeleteTarget(doc);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Confirm and execute document deletion
   */
  const confirmDeletion = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteDocument({ id: deleteTarget.id }).unwrap();
      toast.success('Document deleted.');

      // Clean cache
      documentCache.current.delete(deleteTarget.id);

      if (detailsDoc?.id === deleteTarget.id) {
        closeDetails();
      }
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error('Deletion failed.');
    }
  };

  // ✅ OPTIMIZED CALLBACK: handleAfterChange with cache management
  const handleAfterChange = useCallback(async (updatedDoc?: Document) => {
    if (!detailsDoc?.id) return;

    console.log('🔄 Reloading after change');

    // If we have an updated document, use it directly
    if (updatedDoc && updatedDoc.id === detailsDoc.id) {
      documentCache.current.set(updatedDoc.id, updatedDoc);
      setDetailsDoc(updatedDoc);
      return;
    }

    // Otherwise, reload from API
    try {
      const resp = await fetch(`/api/documents/${detailsDoc.id}?include=companies,contacts`, {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (resp.ok) {
        const json = await resp.json();
        const fullDoc = (json && json.data) ? json.data : json;
        documentCache.current.set(detailsDoc.id, fullDoc);
        setDetailsDoc(fullDoc);
      }
    } catch (error) {
      console.error('Error during reload:', error);
    }
  }, [detailsDoc?.id]);

  // ✅ Clean up AbortControllers on component unmount
  useEffect(() => {
    return () => {
      abortControllers.current.forEach(controller => controller.abort());
      abortControllers.current.clear();
    };
  }, []);

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Documents</h2>}>
      <Head title="Documents" />
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <div className="text-lg font-semibold">Document Management</div>
                </div>
                <Button onClick={openUploadModal} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" />
                  New Document
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {/* Search */}
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
                  <Input
                    className="pl-8 w-[260px] sm:w-[300px]"
                    placeholder="Search (name, file, description)"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
                {/* Type Filter */}
                <Select value={type || 'all'} onValueChange={(v) => { setType(v === 'all' ? '' : v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="image">image/</SelectItem>
                  </SelectContent>
                </Select>
                {/* Tag Filter */}
                <div className="relative">
                  <TagIcon className="h-4 w-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
                  <Input
                    className="pl-8 w-[160px]"
                    placeholder="Tag"
                    value={tag}
                    onChange={(e) => { setTag(e.target.value); setPage(1); }}
                  />
                </div>
                {/* Sort */}
                <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created_at">Most recent</SelectItem>
                    <SelectItem value="created_at">Oldest</SelectItem>
                    <SelectItem value="name">Name A→Z</SelectItem>
                    <SelectItem value="-name">Name Z→A</SelectItem>
                    <SelectItem value="-size_bytes">Largest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Size</th>
                    <th className="px-4 py-2">Visibility</th>
                    <th className="px-4 py-2">Author</th>
                    <th className="px-4 py-2">Created</th>
                    <th className="px-4 py-2 w-[160px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(isLoading || isFetching) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      </td>
                    </tr>
                  )}
                  {!isDataLoading && items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                        No documents. Upload a new one.
                      </td>
                    </tr>
                  )}
                  {items.map((d: Document) => (
                    <tr
                      key={d.id}
                      className="border-t hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => openDetails(d)}
                      title="Click to view details"
                    >
                      <td className="px-4 py-2 font-medium text-gray-900 flex items-center gap-2">
                        {iconForExtension(d.extension)}
                        <span>{d.name}</span>
                        <span className="text-xs text-gray-500">({d.original_filename})</span>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{d.extension?.toUpperCase() || d.mime_type}</td>
                      <td className="px-4 py-2 text-gray-700">{formatBytes(d.size_bytes)}</td>
                      <td className="px-4 py-2">
                        <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', badgeForVisibility(d.visibility)].join(' ')}>
                          {d.visibility}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{d.owner?.name ?? '-'}</td>
                      <td className="px-4 py-2 text-gray-700">{d.created_at ? new Date(d.created_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <Button
                            title="Download"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity"
                            onClick={() => download(d)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            title="Details"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity"
                            onClick={() => openDetails(d)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button title="More actions" variant="ghost" size="icon" className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => download(d)} className="gap-2">
                                <Download className="h-4 w-4" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDetails(d)} className="gap-2">
                                <Eye className="h-4 w-4" /> Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => requestDeletion(d)}
                                className="text-red-600 gap-2"
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-gray-600">Results: {total}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isDataLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <div className="px-2 py-1 text-sm">Page {currentPage} / {lastPage}</div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= lastPage || isDataLoading}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Modal */}
        <UploadModal
          isOpen={openUpload}
          onClose={closeUploadModal}
          onUploaded={onUploaded}
          searchCompanies={searchCompanies}
          searchContacts={searchContacts}
          upload={async (form) => {
            await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
            return await uploadDocument(form).unwrap();
          }}
        />

        {/* ✅ OPTIMIZED Details Dialog */}
        <DocumentDetailsModal
          key={detailsDoc?.id} // Force re-render only if ID changes
          open={detailsOpen}
          onOpenChange={closeDetails}
          document={detailsDoc} // ✅ Direct props - no local state
          isLoading={isLoadingDetails}
          onAfterChange={handleAfterChange}
          searchCompanies={searchCompanies}
          searchContacts={searchContacts}
        />

        {/* Delete confirmation dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete document?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete "{deleteTarget?.name}". This action is irreversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletion} className="bg-red-600 hover:bg-red-700">
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthenticatedLayout>
  );
}
