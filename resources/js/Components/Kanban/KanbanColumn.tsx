// resources/js/Components/Kanban/KanbanColumn.tsx
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Contact } from '@/types/Contact';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { ArrowLeft, MoreVertical, Edit, Trash } from 'lucide-react';
import { useDrop, useDrag } from 'react-dnd';
import { useGetContactsByStatusQuery } from '@/services/api';
import { Button } from '@/Components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu';

const ItemTypes = { CONTACT: 'contact' };

interface KanbanColumnProps {
  status: Contact['status'];
  perPage: number;
  columnHeight: number;
  onDropContact: (id: number, status: Contact['status']) => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (id: number) => void;
  onMoveContact: (id: number, status: Contact['status']) => void;
  kanbanStatuses: Contact['status'][];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status, perPage, columnHeight,
  onDropContact, onEditContact, onDeleteContact, onMoveContact, kanbanStatuses
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'contact',
    drop: (item: { id: number; currentStatus: Contact['status'] }) => {
      if (item.currentStatus !== status) onDropContact(item.id, status);
    },
    collect: monitor => ({ isOver: monitor.isOver() })
  }), [status, onDropContact]);

  // Map de couleurs par statut (fond en-tête + légère teinte de fond colonne)
  const palette = useMemo(() => {
    switch (status) {
      case 'Nouveau': return { headerBg: 'bg-blue-50', headerText: 'text-blue-800', bodyBg: 'bg-blue-50/40', border: 'border-blue-200' };
      case 'Qualification': return { headerBg: 'bg-yellow-50', headerText: 'text-yellow-800', bodyBg: 'bg-yellow-50/40', border: 'border-yellow-200' };
      case 'Proposition envoyée': return { headerBg: 'bg-purple-50', headerText: 'text-purple-800', bodyBg: 'bg-purple-50/40', border: 'border-purple-200' };
      case 'Négociation': return { headerBg: 'bg-orange-50', headerText: 'text-orange-800', bodyBg: 'bg-orange-50/40', border: 'border-orange-200' };
      case 'Converti': return { headerBg: 'bg-green-50', headerText: 'text-green-800', bodyBg: 'bg-green-50/40', border: 'border-green-200' };
      case 'Perdu': return { headerBg: 'bg-red-50', headerText: 'text-red-800', bodyBg: 'bg-red-50/40', border: 'border-red-200' };
      default: return { headerBg: 'bg-gray-50', headerText: 'text-gray-800', bodyBg: 'bg-gray-50', border: 'border-gray-200' };
    }
  }, [status]);

  // Cursor + accumulation locale
  const [cursor, setCursor] = useState<string | null>(null);
  const [items, setItems] = useState<Contact[]>([]);
  const { data, isFetching, isLoading } = useGetContactsByStatusQuery({ status, per_page: perPage, cursor });

  useEffect(() => {
    if (!data?.data) return;
    if (cursor === null) {
      setItems(data.data);
    } else {
      setItems(prev => {
        const ids = new Set(prev.map(c => c.id));
        const unique = data.data.filter(c => !ids.has(c.id));
        return [...prev, ...unique];
      });
    }
  }, [data?.data, cursor]);

  const hasMore = Boolean(data?.next_cursor);

  // Détection bas
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleScroll = useCallback(() => {
    if (!hasMore || isFetching) return;
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150) {
      setCursor(data?.next_cursor || null);
    }
  }, [hasMore, isFetching, data?.next_cursor]);

  useEffect(() => {
    const el = scrollRef.current;
    el?.addEventListener('scroll', handleScroll, { passive: true });
    return () => el?.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Carte (KanbanCard) interne inchangée sauf marges/hover soft
  const KanbanCard: React.FC<{ contact: Contact }> = ({ contact }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: ItemTypes.CONTACT,
      item: { id: contact.id, currentStatus: contact.status },
      collect: (m) => ({ isDragging: m.isDragging() }),
    }), [contact]);
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
    return (
      <Card
        ref={drag}
        className={`
          p-3 bg-white rounded-lg shadow-sm relative border border-gray-200
          hover:shadow-md transition-all duration-150
          ${isDragging ? 'opacity-60' : ''}
          border-l-4
          ${contact.status === 'Nouveau' ? 'border-l-blue-400' :
            contact.status === 'Qualification' ? 'border-l-yellow-400' :
            contact.status === 'Proposition envoyée' ? 'border-l-purple-400' :
            contact.status === 'Négociation' ? 'border-l-orange-400' :
            contact.status === 'Converti' ? 'border-l-green-400' : 'border-l-red-400'}
        `}
        onDoubleClick={() => onEditContact(contact)}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contact.avatar} alt={contact.name} />
            <AvatarFallback className="bg-gray-200 text-gray-700">{getInitials(contact.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold text-gray-900 truncate">{contact.name}</CardTitle>
            <CardDescription className="text-xs text-gray-500 truncate mt-1">{contact.company || 'Sans entreprise'}</CardDescription>
            {contact.email && (
              <p className="text-xs text-gray-600 truncate mt-1">
                <a href={`mailto:${contact.email}`} className="hover:text-blue-600 hover:underline">{contact.email}</a>
              </p>
            )}
          </div>
        </div>
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditContact(contact)}>
                <Edit className="mr-2 h-4 w-4 text-blue-500" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuLabel>Déplacer vers</DropdownMenuLabel>
              <div className="grid grid-cols-2 gap-1 px-1">
                {kanbanStatuses.map(s => s !== contact.status && (
                  <DropdownMenuItem key={s} onClick={() => onMoveContact(contact.id, s)} className="text-xs">
                    {s}
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDeleteContact(contact.id)} className="text-red-600">
                <Trash className="mr-2 h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    );
  };

  return (
    <Card
      ref={drop}
      className={`
        w-80 min-w-[20rem] flex-shrink-0 flex flex-col border ${palette.border}
        rounded-lg shadow-sm transition-all
        ${isOver ? 'ring-2 ring-blue-400' : ''}
      `}
      aria-label={`Colonne ${status}`}
    >
      <CardHeader className={`py-3 px-4 border-b ${palette.headerBg}`}>
        <div className="flex justify-between items-center">
          <CardTitle className={`text-md font-bold ${palette.headerText}`}>{status}</CardTitle>
          <Badge variant="secondary" className="bg-white border border-gray-300 text-gray-700">
            {items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={`p-3 flex-1 overflow-hidden ${palette.bodyBg}`}>
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto pr-2"
          style={{ maxHeight: `${columnHeight}px` }}
          role="list"
        >
          <div className="space-y-3"> {/* ✅ espace vertical entre cartes */}
            {items.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <ArrowLeft className="mb-2" /> Glissez-déposez des contacts ici
              </div>
            ) : (
              items.map(c => (
                <div role="listitem" key={c.id}>
                  <KanbanCard contact={c} />
                </div>
              ))
            )}

            {isFetching && <div className="text-center text-sm text-gray-500 py-2">Chargement...</div>}
            {!isFetching && !hasMore && items.length > 0 && (
              <div className="text-center text-xs text-gray-400 py-2">Fin de la liste</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KanbanColumn;
