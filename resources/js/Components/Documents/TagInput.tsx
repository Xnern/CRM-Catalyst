import React, { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { X } from 'lucide-react';

type Props = {
  value: string[];
  onChange: (v: string[]) => void;
  maxLength?: number;
};

export const TagInput: React.FC<Props> = ({ value, onChange, maxLength = 30 }) => {
  const [input, setInput] = useState('');

  const addTag = () => {
    const v = input.trim();
    if (!v) return;
    if (v.length > maxLength) return;
    if (value.includes(v)) return;
    onChange([...value, v]);
    setInput('');
  };

  const removeTag = (t: string) => onChange(value.filter(x => x !== t));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(t => (
          <span key={t} className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs inline-flex items-center gap-2">
            {t}
            <button className="text-red-600 hover:underline" onClick={() => removeTag(t)}>
                <X className="h-3.5 w-3.5 text-red-600 hover:text-red-700" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' ? (e.preventDefault(), addTag()) : null}
          placeholder="Ajouter un tag"
        />
        <Button type="button" onClick={addTag}>Ajouter</Button>
      </div>
    </div>
  );
};
