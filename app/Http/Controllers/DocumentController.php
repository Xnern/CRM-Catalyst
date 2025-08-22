<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Document;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use App\Models\DocumentVersion;
use Illuminate\Support\Facades\Storage;
use App\Http\Resources\DocumentResource;
use App\Http\Requests\Documents\DocumentStoreRequest;
use App\Http\Requests\Documents\DocumentUpdateRequest;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    /**
     * Render the Documents list page (Inertia React).
     */
    public function indexInertia()
    {
        return Inertia::render('Documents/Index');
    }

    /**
     * GET /api/documents
     * List documents with filters/search/sort and pagination.
     * Returns a paginated DocumentResource::collection.
     */
    public function index(Request $req)
    {
        $query = Document::query()
            ->with(['owner:id,name,email']) // minimal owner fields for list
            ->when($req->search, function ($qq, $s) {
                $s = trim((string) $s);
                if ($s === '') return;
                $qq->where(function ($w) use ($s) {
                    $w->where('name', 'like', "%{$s}%")
                      ->orWhere('original_filename', 'like', "%{$s}%")
                      ->orWhere('description', 'like', "%{$s}%")
                      ->orWhereJsonContains('tags', $s);
                });
            })
            ->when($req->tag, fn ($qq, $tag) => $qq->whereJsonContains('tags', $tag))
            ->when($req->type, fn ($qq, $type) => $qq->where(function ($w) use ($type) {
                $w->where('mime_type', 'like', "{$type}%")
                  ->orWhere('extension', $type);
            }))
            ->when($req->owner_id, fn ($qq, $id) => $qq->where('owner_id', (int) $id))
            ->when($req->company_id, fn ($qq, $id) => $qq->whereHas('companies', fn ($h) => $h->where('companies.id', (int) $id)))
            ->when($req->contact_id, fn ($qq, $id) => $qq->whereHas('contacts', fn ($h) => $h->where('contacts.id', (int) $id)));

        // Sorting
        if ($sort = $req->get('sort')) {
            $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
            $column = ltrim($sort, '-');
            $query->orderBy($column, $direction);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = (int) $req->integer('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $paginator = $query->paginate($perPage);

        // Keep paginator (data/meta/links) while serializing items
        return DocumentResource::collection($paginator)
            ->response()
            ->setStatusCode(200);
    }

    /**
     * GET /api/documents/{document}
     * Show a single document with owner, companies, contacts.
     * Returns a DocumentResource.
     */
    public function show(Document $document)
    {
        $document->load([
            'owner:id,name,email',
            'companies' => fn ($q) => $q->select('companies.id', 'companies.name'),
            'contacts' => fn ($q) => $q->select('contacts.id', 'contacts.name'),
        ]);

        return (new DocumentResource($document))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * POST /api/documents
     * Store a new document (multipart) and optionally attach links (company/contact).
     * Returns the created DocumentResource.
     */
    public function store(DocumentStoreRequest $req)
    {
        $this->authorize('create', Document::class);

        \Log::info('Upload links received:', ['links' => $req->input('links', [])]);

        $user = $req->user();
        $file = $req->file('file');

        $uuid = (string) Str::uuid();
        $ext = $file->getClientOriginalExtension();
        $disk = config('filesystems.default', 's3');
        $path = 'documents/' . now()->format('Y/m') . "/{$uuid}/" . $file->getClientOriginalName();

        // Store file
        Storage::disk($disk)->put($path, file_get_contents($file->getRealPath()));

        $doc = Document::create([
            'uuid' => $uuid,
            'name' => $req->input('name', pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)),
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'extension' => $ext,
            'size_bytes' => $file->getSize(),
            'storage_disk' => $disk,
            'storage_path' => $path,
            'owner_id' => $user->id,
            'visibility' => $req->input('visibility', 'private'),
            'description' => $req->input('description'),
            'tags' => $req->input('tags', []),
        ]);

        // Create initial version
        $doc->versions()->create([
            'version' => 1,
            'storage_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'created_by' => $user->id,
        ]);

        // Attach links (companies/contacts) with optional 'role'
        foreach ((array) $req->input('links', []) as $link) {
            $type = $link['type'] ?? null;
            $linkId = isset($link['id']) ? (int) $link['id'] : null;
            $role = $link['role'] ?? null;

            if ($type === 'company' && $linkId) {
                // Ensure company exists
                Company::findOrFail($linkId);
                $doc->companies()->syncWithoutDetaching([$linkId => ['role' => $role]]);
            } elseif ($type === 'contact' && $linkId) {
                // Ensure contact exists
                Contact::findOrFail($linkId);
                $doc->contacts()->syncWithoutDetaching([$linkId => ['role' => $role]]);
            }
        }

        $doc->load([
            'owner:id,name,email',
            'companies' => fn ($q) => $q->select('companies.id', 'companies.name'),
            'contacts' => fn ($q) => $q->select('contacts.id', 'contacts.name'),
        ]);

        return (new DocumentResource($doc))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * PATCH /api/documents/{document}
     * Update document metadata (name, description, visibility, tags, etc.).
     * Returns the updated DocumentResource.
     */
    public function update(DocumentUpdateRequest $req, Document $document)
    {
        $this->authorize('update', $document);

        $document->fill($req->validated());
        $document->save();

        $document->load([
            'owner:id,name,email',
            'companies' => fn ($q) => $q->select('companies.id', 'companies.name'),
            'contacts' => fn ($q) => $q->select('contacts.id', 'contacts.name'),
        ]);

        return (new DocumentResource($document))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * DELETE /api/documents/{document}
     * Soft delete by default; supports hard delete with ?hard_delete=true.
     * Returns a simple status payload.
     */
    public function destroy(Request $req, Document $document)
    {
        $this->authorize('delete', $document);

        $hard = filter_var($req->get('hard_delete', false), FILTER_VALIDATE_BOOL);

        if ($hard) {
            Storage::disk($document->storage_disk)->delete($document->storage_path);
            $document->forceDelete();
        } else {
            $document->delete();
        }

        return response()->json(['status' => 'ok'], 200);
    }

    /**
     * GET /api/documents/{document}/download
     * Return a signed URL for S3 or stream the file for local disks.
     */
    public function download(Document $document)
    {
        $this->authorize('download', $document);

        $disk = Storage::disk($document->storage_disk);

        // S3: provide a temporary signed URL (JSON)
        if ($document->storage_disk === 's3' && method_exists($disk, 'temporaryUrl')) {
            $url = $disk->temporaryUrl($document->storage_path, now()->addMinutes(5));
            return response()->json(['url' => $url], 200);
        }

        // Local/other disks: stream the file
        if (!$disk->exists($document->storage_path)) {
            abort(404);
        }

        $stream = $disk->readStream($document->storage_path);

        return new StreamedResponse(function () use ($stream) {
            fpassthru($stream);
        }, 200, [
            'Content-Type' => $document->mime_type,
            'Content-Length' => $document->size_bytes,
            'Content-Disposition' => 'attachment; filename="'.$document->original_filename.'"',
        ]);
    }

    /**
     * POST /api/documents/{document}/links
     * Attach a link (company/contact) with optional role.
     * Returns the updated DocumentResource.
     */
    public function attachLink(Request $req, Document $document)
    {
        $this->authorize('update', $document);

        $data = $req->validate([
            'type' => ['required', 'in:company,contact'],
            'id' => ['required', 'integer'],
            'role' => ['nullable', 'string', 'max:50'],
        ]);

        $linkId = (int) $data['id'];
        $role = $data['role'] ?? null;

        if ($data['type'] === 'company') {
            Company::findOrFail($linkId);
            $document->companies()->syncWithoutDetaching([$linkId => ['role' => $role]]);
        } else {
            Contact::findOrFail($linkId);
            $document->contacts()->syncWithoutDetaching([$linkId => ['role' => $role]]);
        }

        $document->load([
            'owner:id,name,email',
            'companies' => fn ($q) => $q->select('companies.id', 'companies.name'),
            'contacts' => fn ($q) => $q->select('contacts.id', 'contacts.name'),
        ]);

        return (new DocumentResource($document))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * DELETE /api/documents/{document}/unlinks
     * Detach a link (company/contact).
     * Returns the updated DocumentResource.
     */
    public function detachLink(Request $req, Document $document)
    {
        $this->authorize('update', $document);

        $data = $req->validate([
            'type' => ['required', 'in:company,contact'],
            'id' => ['required', 'integer'],
        ]);

        $linkId = (int) $data['id'];

        if ($data['type'] === 'company') {
            $document->companies()->detach($linkId);
        } else {
            $document->contacts()->detach($linkId);
        }

        $document->load([
            'owner:id,name,email',
            'companies' => fn ($q) => $q->select('companies.id', 'companies.name'),
            'contacts' => fn ($q) => $q->select('contacts.id', 'contacts.name'),
        ]);

        return (new DocumentResource($document))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * POST /api/documents/{document}/versions
     * Upload a new version of the document and update main pointers.
     * Returns the version number and the updated DocumentResource(with versions if desired).
     */
    public function storeVersion(Request $req, Document $document)
    {
        $this->authorize('update', $document);

        $data = $req->validate([
            'file' => ['required', 'file', 'max:25600', 'mimes:pdf,doc,docx,rtf,odt,xls,xlsx,xlsm,ods,csv,ppt,pptx,odp,txt,md,png,jpg,jpeg,gif,bmp,tiff,webp,svg,zip'],
        ]);

        $file = $req->file('file');
        $disk = $document->storage_disk;

        $nextVersion = (int) ($document->versions()->max('version') ?? 0) + 1;

        $path = 'documents/' . $document->created_at->format('Y/m') . "/{$document->uuid}/v{$nextVersion}-" . $file->getClientOriginalName();

        Storage::disk($disk)->put($path, file_get_contents($file->getRealPath()));

        $version = DocumentVersion::create([
            'document_id' => $document->id,
            'version' => $nextVersion,
            'storage_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'created_by' => $req->user()->id,
        ]);

        // Update main document pointers
        $document->update([
            'storage_path' => $path,
            'mime_type' => $version->mime_type,
            'size_bytes' => $version->size_bytes,
            'original_filename' => $file->getClientOriginalName(),
            'extension' => $file->getClientOriginalExtension(),
        ]);

        $document->load(['owner:id,name,email']);

        return response()->json([
            'version' => $version->version,
            'document' => (new DocumentResource($document))->toArray($req),
        ], 200);
    }

    /**
     * GET /api/documents/{document}/versions
     * Return all versions for the document.
     */
    public function listVersions(Document $document)
    {
        $this->authorize('view', $document);

        return $document->versions()->get();
    }

    /**
     * GET /api/documents/{document}/preview
     * Inline preview of the document (stream or signed URL if adapted).
     */
    public function preview(Document $document)
    {
        $disk = $document->storage_disk ?? 'local';
        $path = $document->storage_path;

        if (!Storage::disk($disk)->exists($path)) {
            abort(404);
        }

        // If you want to return a signed URL for S3 as JSON, enable this block:
        // if ($disk === 's3') {
        //     $mime = $document->mime_type ?: 'application/octet-stream';
        //     $signedUrl = Storage::disk('s3')->temporaryUrl(
        //         $path,
        //         now()->addMinutes(5),
        //         [
        //             'ResponseContentType' => $mime,
        //             'ResponseContentDisposition' => 'inline; filename="'.$document->original_filename.'"',
        //         ]
        //     );
        //     return response()->json(['url' => $signedUrl]);
        // }

        $mime = $document->mime_type ?: Storage::disk($disk)->mimeType($path);
        $stream = Storage::disk($disk)->readStream($path);

        return response()->stream(function () use ($stream) {
            fpassthru($stream);
        }, 200, [
            'Content-Type' => $mime ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="'.$document->original_filename.'"',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
