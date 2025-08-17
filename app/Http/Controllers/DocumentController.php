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
use App\Http\Resources\Documents\DocumentResource;
use App\Http\Requests\Documents\DocumentStoreRequest;
use App\Http\Requests\Documents\DocumentUpdateRequest;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{

    public function indexInertia()
    {
        return Inertia::render('Documents/Index');
    }

    // GET /api/documents
    public function index(Request $req)
    {
        // Optional: define viewAny policy if needed
        $q = Document::query()->with(['owner'])
            ->when($req->search, function ($qq, $s) {
                $qq->where(function ($w) use ($s) {
                    $w->where('name', 'like', "%$s%")
                      ->orWhere('original_filename', 'like', "%$s%")
                      ->orWhere('description', 'like', "%$s%")
                      ->orWhereJsonContains('tags', $s);
                });
            })
            ->when($req->tag, fn($qq, $tag) => $qq->whereJsonContains('tags', $tag))
            ->when($req->type, fn($qq, $type) => $qq->where(function ($w) use ($type) {
                $w->where('mime_type', 'like', "$type%")->orWhere('extension', $type);
            }))
            ->when($req->owner_id, fn($qq, $id) => $qq->where('owner_id', $id))
            ->when($req->company_id, fn($qq, $id) => $qq->whereHas('companies', fn($h) => $h->where('companies.id', $id)))
            ->when($req->contact_id, fn($qq, $id) => $qq->whereHas('contacts', fn($h) => $h->where('contacts.id', $id)));

        if ($sort = $req->get('sort')) {
            $dir = str_starts_with($sort, '-') ? 'desc' : 'asc';
            $col = ltrim($sort, '-');
            $q->orderBy($col, $dir);
        } else {
            $q->orderBy('created_at', 'desc');
        }

        $docs = $q->paginate($req->integer('per_page', 15));
        return DocumentResource::collection($docs);
    }

    // GET /api/documents/{document}
    public function show(Document $document)
    {
        $document->load([
            'owner:id,name',
            'companies:id,name',   
            'contacts:id,name',
        ]);

        $companies = $document->companies->map(function ($c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'role' => $c->pivot->role ?? null,
            ];
        });

        $contacts = $document->contacts->map(function ($c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'role' => $c->pivot->role ?? null,
            ];
        });

        return response()->json([
            'id' => $document->id,
            'uuid' => $document->uuid,
            'name' => $document->name,
            'original_filename' => $document->original_filename,
            'mime_type' => $document->mime_type,
            'extension' => $document->extension,
            'size_bytes' => $document->size_bytes,
            'visibility' => $document->visibility,
            'description' => $document->description,
            'tags' => $document->tags ?? [],
            'owner' => $document->owner ? ['id' => $document->owner->id, 'name' => $document->owner->name] : null,
            'companies' => $companies,
            'contacts' => $contacts,
            'created_at' => $document->created_at,
            'updated_at' => $document->updated_at,
        ]);
    }

    // POST /api/documents
    public function store(DocumentStoreRequest $req)
    {
        $this->authorize('create', Document::class);
        $user = $req->user();
        $file = $req->file('file');
        $uuid = (string) Str::uuid();
        $ext = $file->getClientOriginalExtension();
        $disk = config('filesystems.default', 's3');
        $path = "documents/" . now()->format('Y/m') . "/{$uuid}/" . $file->getClientOriginalName();

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

        // Links
        foreach ($req->input('links', []) as $link) {
            if (($link['type'] ?? null) === 'company') {
                $company = Company::findOrFail($link['id']);
                $doc->companies()->attach($company->id, ['role' => $link['role'] ?? null]);
            } elseif (($link['type'] ?? null) === 'contact') {
                $contact = Contact::findOrFail($link['id']);
                $doc->contacts()->attach($contact->id, ['role' => $link['role'] ?? null]);
            }
        }

        return new DocumentResource($doc->fresh(['companies','contacts','owner']));
    }

    // PATCH /api/documents/{document}
    public function update(DocumentUpdateRequest $req, Document $document)
    {
        $this->authorize('update', $document);
        $document->fill($req->validated());
        $document->save();
        return new DocumentResource($document->fresh(['companies','contacts','owner']));
    }

    // DELETE /api/documents/{document}
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

        return response()->json(['status' => 'ok']);
    }

    // GET /api/documents/{document}/download
    public function download(Document $document)
    {
        $this->authorize('download', $document);

        $disk = Storage::disk($document->storage_disk);

        // If using S3, return a temporary signed URL
        if ($document->storage_disk === 's3' && method_exists($disk, 'temporaryUrl')) {
            $url = $disk->temporaryUrl($document->storage_path, now()->addMinutes(5));
            return response()->json(['url' => $url]);
        }

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

    // POST /api/documents/{document}/links
    public function attachLink(Request $req, Document $document)
    {
        $this->authorize('update', $document);
        $data = $req->validate([
            'type' => ['required','in:company,contact'],
            'id' => ['required','integer'],
            'role' => ['nullable','string','max:50'],
        ]);

        if ($data['type'] === 'company') {
            $document->companies()->syncWithoutDetaching([$data['id'] => ['role' => $data['role'] ?? null]]);
        } elseif ($data['type'] === 'contact') {
            $document->contacts()->syncWithoutDetaching([$data['id'] => ['role' => $data['role'] ?? null]]);
        }

        return new DocumentResource($document->fresh(['companies','contacts']));
    }

    // DELETE /api/documents/{document}/links
    public function detachLink(Request $req, Document $document)
    {
        $this->authorize('update', $document);
        $data = $req->validate([
            'type' => ['required','in:company,contact'],
            'id' => ['required','integer'],
        ]);

        if ($data['type'] === 'company') {
            $document->companies()->detach($data['id']);
        } elseif ($data['type'] === 'contact') {
            $document->contacts()->detach($data['id']);
        }

        return new DocumentResource($document->fresh(['companies','contacts']));
    }

    // POST /api/documents/{document}/versions
    public function storeVersion(Request $req, Document $document)
    {
        $this->authorize('update', $document);

        $data = $req->validate([
            'file' => ['required','file','max:25600','mimes:pdf,doc,docx,rtf,odt,xls,xlsx,xlsm,ods,csv,ppt,pptx,odp,txt,md,png,jpg,jpeg,gif,bmp,tiff,webp,svg,zip'],
        ]);

        $file = $req->file('file');
        $disk = $document->storage_disk;
        $nextVersion = (int) ($document->versions()->max('version') ?? 0) + 1;
        $path = "documents/" . $document->created_at->format('Y/m') . "/{$document->uuid}/v{$nextVersion}-" . $file->getClientOriginalName();
        Storage::disk($disk)->put($path, file_get_contents($file->getRealPath()));

        $version = DocumentVersion::create([
            'document_id' => $document->id,
            'version' => $nextVersion,
            'storage_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'created_by' => $req->user()->id,
        ]);

        // Important: update main document pointers
        $document->update([
            'storage_path' => $path,
            'mime_type' => $version->mime_type,
            'size_bytes' => $version->size_bytes,
            'original_filename' => $file->getClientOriginalName(),
            'extension' => $file->getClientOriginalExtension(),
        ]);

        return response()->json([
            'version' => $version->version,
            'document' => new DocumentResource($document->fresh(['versions'])),
        ]);
    }


    // GET /api/documents/{document}/versions
    public function listVersions(Document $document)
    {
        $this->authorize('view', $document);
        return $document->versions()->get();
    }

    public function preview(Document $document)
    {
        $disk = $document->storage_disk ?? 'local';
        $path = $document->storage_path;

        if (!\Storage::disk($disk)->exists($path)) {
            abort(404);
        }

        // If you use S3 and want a signed URL in JSON (uncomment and adapt):
        // if ($disk === 's3') {
        //     $mime = $document->mime_type ?: 'application/octet-stream';
        //     $signedUrl = \Storage::disk('s3')->temporaryUrl(
        //         $path,
        //         now()->addMinutes(5),
        //         [
        //             'ResponseContentType' => $mime,
        //             'ResponseContentDisposition' => 'inline; filename="'.$document->original_filename.'"',
        //         ]
        //     );
        //     return response()->json(['url' => $signedUrl]);
        // }

        $mime = $document->mime_type ?: \Storage::disk($disk)->mimeType($path);
        $stream = \Storage::disk($disk)->readStream($path);

        return response()->stream(function () use ($stream) {
            fpassthru($stream);
        }, 200, [
            'Content-Type' => $mime ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="'.$document->original_filename.'"',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
