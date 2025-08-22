import React from 'react';
import { Button } from '@/Components/ui/button';
import { Building2, FileText, Eye, X, Plus, UploadCloud } from 'lucide-react';

type LinkedCompany = { id: number; name: string; role?: string | null };
type LinkedDocument = { id: number; name: string; extension?: string | null; mime_type?: string; size_bytes?: number; created_at?: string };

type Props = {
  companies: LinkedCompany[];
  documents: LinkedDocument[];
  // Company actions
  onDetachCompany: (companyId: number) => Promise<void> | void;
  onAttachCompany: (item: { id: number; name: string; role?: string }) => Promise<void> | void;
  // Document actions
  onDetachDocument: (docId: number) => Promise<void> | void;
  onOpenDocumentDetails: (docId: number) => void;
  onOpenUpload: () => void;
  // Search providers (for LinkPicker in parent)
  renderCompanyPicker?: React.ReactNode; // Parent can inject a LinkPicker UI for companies
  renderDocumentPicker?: React.ReactNode; // Optional extension (e.g., add existing document)
};

export const ContactLinkSection: React.FC<Props> = ({
  companies,
  documents,
  onDetachCompany,
  onAttachCompany,
  onDetachDocument,
  onOpenDocumentDetails,
  onOpenUpload,
  renderCompanyPicker,
  renderDocumentPicker,
}) => {
  return (
    <div className="space-y-6">
      {/* Companies section */}
      <div className="rounded-md border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Building2 className="h-4 w-4" />
            <span className="font-medium text-gray-900">Entreprises liées</span>
          </div>
          <div className="flex items-center gap-2">
            {/* The picker is provided by parent to choose shape/behavior */}
            {renderCompanyPicker ?? null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {companies?.length ? companies.map((c) => (
            <span key={c.id} className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs inline-flex items-center gap-2">
              {c.name}{c.role ? <span className="text-gray-500">({c.role})</span> : null}
              <button
                type="button"
                onClick={() => onDetachCompany(c.id)}
                className="inline-flex items-center justify-center rounded hover:bg-red-50"
                aria-label="Retirer"
                title="Détacher cette entreprise"
              >
                <X className="h-3.5 w-3.5 text-red-600 hover:text-red-700" />
              </button>
            </span>
          )) : (
            <span className="text-gray-500 text-sm">—</span>
          )}
        </div>
      </div>

      {/* Documents section */}
      <div className="rounded-md border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <FileText className="h-4 w-4" />
            <span className="font-medium text-gray-900">Documents liés</span>
          </div>
          <div className="flex items-center gap-2">
            {renderDocumentPicker ?? null}
            <Button variant="outline" size="sm" className="gap-2" onClick={onOpenUpload}>
              <UploadCloud className="h-4 w-4" />
              Téléverser
            </Button>
          </div>
        </div>

        {documents?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Taille</th>
                  <th className="px-3 py-2">Créé le</th>
                  <th className="px-3 py-2 w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-t hover:bg-gray-50/60 transition-colors">
                    <td className="px-3 py-2 font-medium text-gray-900">{d.name}</td>
                    <td className="px-3 py-2 text-gray-700">{d.extension?.toUpperCase() || d.mime_type}</td>
                    <td className="px-3 py-2 text-gray-700">{d.size_bytes ? `${(d.size_bytes/1024).toFixed(1)} KB` : '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-80 hover:opacity-100"
                          title="Détails"
                          onClick={() => onOpenDocumentDetails(d.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 opacity-80 hover:opacity-100"
                          title="Détacher"
                          onClick={() => onDetachDocument(d.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Aucun document lié.</div>
        )}
      </div>
    </div>
  );
};
