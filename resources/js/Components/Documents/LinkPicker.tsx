import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/Components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/Components/ui/select';
import { Button } from '@/Components/ui/button';
import { X } from 'lucide-react';

type Link = { type: 'company' | 'contact'; id: number; name: string; role?: string };

type Props = {
  value: Link[];
  onChange: (v: Link[]) => void;
  searchCompanies: (q: string) => Promise<{ id: number; name: string }[]>;
  searchContacts: (q: string) => Promise<{ id: number; name: string }[]>;
  minChars?: number;              // minimum chars before search
  debounceMs?: number;            // debounce delay
  disableCompanySearch?: boolean; // when true, hide/disable company option
  disableContactSearch?: boolean; // when true, hide/disable contact option
};

export const LinkPicker: React.FC<Props> = ({
  value,
  onChange,
  searchCompanies,
  searchContacts,
  minChars = 2,
  debounceMs = 300,
  disableCompanySearch = false,
  disableContactSearch = false, // New prop
}) => {
  // Improved logic to determine default type
  const getDefaultType = (): 'company' | 'contact' => {
    if (disableCompanySearch && !disableContactSearch) return 'contact';
    if (disableContactSearch && !disableCompanySearch) return 'company';
    return 'company'; // Default if both are enabled
  };

  const [type, setType] = useState<'company' | 'contact'>(getDefaultType());
  const [q, setQ] = useState('');
  const [role, setRole] = useState<string>('');
  const [results, setResults] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Internal refs for debounce and request identity
  const timerRef = useRef<number | null>(null);
  const lastRequestKeyRef = useRef<string>(''); // tracks last (type,q) searched to avoid redundant calls
  const abortedRef = useRef<boolean>(false);

  const canSearch = useMemo(() => q.trim().length >= minChars, [q, minChars]);

  // Check if at least one search option is available
  const hasSearchOptions = !disableCompanySearch || !disableContactSearch;

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      abortedRef.current = true;
    };
  }, []);

  useEffect(() => {
    // Cancel previous debounce
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // If min chars not reached, reset state
    if (!canSearch) {
      setResults([]);
      setError(null);
      setLoading(false);
      lastRequestKeyRef.current = '';
      return;
    }

    // Improved logic to determine current type
    let actualType = type;
    if (disableCompanySearch && actualType === 'company') {
      actualType = 'contact';
    }
    if (disableContactSearch && actualType === 'contact') {
      actualType = 'company';
    }

    // If both are disabled, don't search
    if (disableCompanySearch && disableContactSearch) {
      setResults([]);
      setError('Aucun type de recherche disponible');
      setLoading(false);
      return;
    }

    const requestKey = `${actualType}|${q.trim()}`;

    // Skip if same request (avoid re-run)
    if (requestKey === lastRequestKeyRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    // Debounced search
    timerRef.current = window.setTimeout(async () => {
      if (abortedRef.current) return;

      lastRequestKeyRef.current = requestKey;

      try {
        const fn = actualType === 'company' ? searchCompanies : searchContacts;
        const data = await fn(q.trim());
        if (lastRequestKeyRef.current !== requestKey) return;
        setResults(Array.isArray(data) ? data : []);
      } catch (_e) {
        if (lastRequestKeyRef.current !== requestKey) return;
        setError('La recherche a échoué');
        setResults([]);
      } finally {
        if (lastRequestKeyRef.current === requestKey) {
          setLoading(false);
        }
      }
    }, debounceMs) as unknown as number;

    // Cleanup for next effect
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [q, type, canSearch, searchCompanies, searchContacts, debounceMs, disableCompanySearch, disableContactSearch]);

  const add = (item: { id: number; name: string }) => {
    // Improved logic to determine type
    let actualType = type;
    if (disableCompanySearch && actualType === 'company') {
      actualType = 'contact';
    }
    if (disableContactSearch && actualType === 'contact') {
      actualType = 'company';
    }

    const link: Link = { type: actualType, id: item.id, name: item.name, role: role || undefined };
    if (!value.find((v) => v.type === link.type && v.id === link.id)) {
      onChange([...value, link]);
    }
    setQ('');
    setRole('');
    setResults([]);
    setError(null);
    setLoading(false);
    lastRequestKeyRef.current = '';
  };

  const remove = (l: Link) => onChange(value.filter((v) => !(v.type === l.type && v.id === l.id)));

  // Function to get dynamic placeholder
  const getSearchPlaceholder = () => {
    if (disableCompanySearch && !disableContactSearch) {
      return `Rechercher un contact (min ${minChars})`;
    }
    if (disableContactSearch && !disableCompanySearch) {
      return `Rechercher une entreprise (min ${minChars})`;
    }
    if (disableCompanySearch && disableContactSearch) {
      return 'Aucune recherche disponible';
    }
    return `Rechercher ${type === 'company' ? 'une entreprise' : 'un contact'} (min ${minChars})`;
  };

  // If no option is available, show message
  if (!hasSearchOptions) {
    return (
      <div className="p-4 text-center text-gray-500 border rounded-md bg-gray-50">
        Aucun type de recherche disponible
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Row 1 on md+: Type | Search | Reset; stacked on mobile */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        {/* Type selector */}
        <div className="md:col-span-3">
          {/* Improved logic for type selector */}
          {!disableCompanySearch && !disableContactSearch ? (
            // Both options are available
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as any);
                setResults([]);
                setError(null);
                setLoading(false);
                lastRequestKeyRef.current = '';
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Entreprise</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
              </SelectContent>
            </Select>
          ) : disableCompanySearch ? (
            // Only contacts are available
            <Select value="contact" onValueChange={() => {}}>
              <SelectTrigger className="h-10 opacity-60 cursor-not-allowed">
                <SelectValue>Contact</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contact">Contact</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            // Only companies are available
            <Select value="company" onValueChange={() => {}}>
              <SelectTrigger className="h-10 opacity-60 cursor-not-allowed">
                <SelectValue>Entreprise</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Entreprise</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Search input: wide */}
        <div className="md:col-span-6">
          <Input
            placeholder={getSearchPlaceholder()}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10"
            disabled={disableCompanySearch && disableContactSearch}
          />
        </div>

        {/* Reset button */}
        <div className="md:col-span-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQ('');
              setResults([]);
              setError(null);
              setLoading(false);
              lastRequestKeyRef.current = '';
            }}
            className="h-10 w-full md:w-auto border-teal-600 text-teal-700 hover:bg-teal-50"
            disabled={disableCompanySearch && disableContactSearch}
          >
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Row 2 on md+: Role alone full width, to ensure wrapping and comfy spacing */}
      <div className="grid grid-cols-1">
        <Input
          placeholder="Rôle (facultatif)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10"
          disabled={disableCompanySearch && disableContactSearch}
        />
      </div>

      {/* Status line */}
      {loading && <div className="text-xs text-gray-500">Recherche…</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}

      {/* Results list */}
      {results.length > 0 && (
        <div className="border rounded-md p-2 max-h-64 overflow-auto bg-white">
          {results.map((r) => (
            <div
              key={r.id}
              className="py-2 px-2 flex items-center justify-between hover:bg-muted/50 rounded"
            >
              <span className="text-sm text-gray-800 truncate pr-2">{r.name}</span>
              <Button
                size="sm"
                onClick={() => add(r)}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Ajouter
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Selected pills */}
      <div className="flex flex-wrap gap-2">
        {value.map((l) => (
          <span
            key={`${l.type}-${l.id}`}
            className="px-2 py-1 rounded bg-teal-50 text-teal-700 text-xs inline-flex items-center gap-2 border border-teal-200"
          >
            <span className="truncate max-w-[260px]">
              {l.type === 'company' ? 'Entreprise' : 'Contact'}: {l.name}
              {l.role ? ` (${l.role})` : ''}
            </span>
            <button
              type="button"
              onClick={() => remove(l)}
              className="inline-flex items-center justify-center rounded hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5 text-red-600" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};
