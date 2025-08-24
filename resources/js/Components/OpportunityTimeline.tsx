import React, { useState, useEffect } from 'react';
import { 
  Clock, MessageSquare, Phone, Calendar, Mail, 
  CheckCircle, Flag, Edit, Plus, Info, Trash2,
  Activity, User, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Textarea } from '@/Components/ui/textarea';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  type: 'system' | 'note' | 'activity' | 'stage_change';
  action: string;
  description: string;
  user: string;
  user_id: number;
  created_at: string;
  completed_at?: string;
  icon: string;
  color: string;
  properties?: any;
}

interface TimelineGroup {
  [key: string]: TimelineEvent[];
}

interface OpportunityTimelineProps {
  opportunityId: number;
  className?: string;
}

export default function OpportunityTimeline({ opportunityId, className }: OpportunityTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineGroup>({});
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Aujourd\'hui', 'Hier']);
  const [stats, setStats] = useState({
    notes: 0,
    activities: 0,
    system_logs: 0,
  });

  useEffect(() => {
    fetchTimeline();
  }, [opportunityId]);

  const fetchTimeline = async () => {
    try {
      console.log('Fetching timeline for opportunity:', opportunityId);
      const response = await fetch(`/api/opportunites/${opportunityId}/timeline`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Timeline data received:', data);
        setTimeline(data.timeline || {});
        setStats(data.stats || { notes: 0, activities: 0, system_logs: 0 });
      } else {
        const errorData = await response.text();
        console.error('Timeline fetch error:', response.status, errorData);
        toast.error(`Erreur ${response.status}: Impossible de charger la timeline`);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
      toast.error('Erreur lors du chargement de la timeline');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;

    setSubmittingNote(true);
    try {
      const response = await fetch(`/api/opportunites/${opportunityId}/timeline/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ content: noteContent }),
      });

      if (response.ok) {
        toast.success('Note ajoutée avec succès');
        setNoteContent('');
        setShowAddNote(false);
        fetchTimeline();
      } else {
        toast.error('Erreur lors de l\'ajout de la note');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'ajout de la note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const getIcon = (iconName: string) => {
    const iconProps = { className: "h-4 w-4" };
    switch (iconName) {
      case 'plus': return <Plus {...iconProps} />;
      case 'edit': return <Edit {...iconProps} />;
      case 'trash': return <Trash2 {...iconProps} />;
      case 'flag': return <Flag {...iconProps} />;
      case 'stage': return <Flag {...iconProps} />;
      case 'message':
      case 'note': return <MessageSquare {...iconProps} />;
      case 'phone': return <Phone {...iconProps} />;
      case 'calendar': return <Calendar {...iconProps} />;
      case 'mail': return <Mail {...iconProps} />;
      case 'check': return <CheckCircle {...iconProps} />;
      case 'activity': return <Activity {...iconProps} />;
      default: return <Info {...iconProps} />;
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasEvents = Object.keys(timeline).length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Historique d'activité</CardTitle>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span>{stats.notes} notes</span>
              <span>{stats.activities} activités</span>
              <span>{stats.system_logs} événements système</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddNote(!showAddNote)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Note rapide
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 pt-0">
        {/* Formulaire d'ajout de note rapide */}
        {showAddNote && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <Textarea
              placeholder="Ajouter une note rapide..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="mb-2"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!noteContent.trim() || submittingNote}
              >
                {submittingNote ? 'Ajout...' : 'Ajouter'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddNote(false);
                  setNoteContent('');
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Timeline */}
        {!hasEvents ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Aucune activité pour le moment</p>
            <p className="text-xs mt-1">Les actions sur cette opportunité apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(timeline).map(([groupName, events]) => (
              <div key={groupName}>
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-3"
                >
                  {expandedGroups.includes(groupName) ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                  {groupName} ({events.length})
                </button>
                
                {expandedGroups.includes(groupName) && (
                  <div className="relative">
                    {/* Ligne verticale */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
                    
                    <div className="space-y-4">
                      {events.map((event, index) => (
                        <div key={event.id} className="relative flex items-start gap-3">
                          {/* Point sur la timeline */}
                          <div className={cn(
                            "relative z-10 flex items-center justify-center h-8 w-8 rounded-full border-2",
                            getColorClasses(event.color)
                          )}>
                            {getIcon(event.icon)}
                          </div>
                          
                          {/* Contenu de l'événement */}
                          <div className="flex-1 pb-4">
                            <div className="bg-white p-3 rounded-lg border">
                              <div className="flex items-start justify-between mb-1">
                                <div>
                                  <span className="font-medium text-sm">{event.action}</span>
                                  {event.type === 'activity' && event.properties?.completed && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      Complété
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(event.created_at), { 
                                    addSuffix: true, 
                                    locale: fr 
                                  })}
                                </span>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-1">
                                {event.description}
                              </p>
                              
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <User className="h-3 w-3" />
                                <span>{event.user}</span>
                                {event.properties?.due_date && (
                                  <>
                                    <span>•</span>
                                    <span>Échéance: {format(new Date(event.properties.due_date), 'dd MMM yyyy', { locale: fr })}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}