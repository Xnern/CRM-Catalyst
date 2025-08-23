import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { ArrowLeft, MoreVertical, Edit, Trash, DollarSign, Calendar, User, Building2, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
// Drag and drop temporairement désactivé
// import { useDroppable, useDraggable } from '@dnd-kit/core';
// import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/Components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger
} from '@/Components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ItemTypes = { OPPORTUNITY: 'opportunity' };

interface Opportunity {
  id: number;
  name: string;
  amount: number;
  probability: number;
  stage: string;
  expected_close_date: string | null;
  contact?: {
    id: number;
    name: string;
  };
  company?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    name: string;
  };
}

interface OpportunityKanbanColumnProps {
  stage: string;
  stageLabel: string;
  opportunities: Opportunity[];
  columnHeight: number;
  onDropOpportunity: (id: number, newStage: string) => void;
  onEditOpportunity: (opportunity: Opportunity) => void;
  onDeleteOpportunity: (id: number) => void;
  onMoveOpportunity: (id: number, newStage: string) => void;
  stages: Array<{ value: string; label: string }>;
  isLoading?: boolean;
}

const OpportunityKanbanColumn: React.FC<OpportunityKanbanColumnProps> = ({
  stage, stageLabel, opportunities, columnHeight,
  onDropOpportunity, onEditOpportunity, onDeleteOpportunity, onMoveOpportunity, stages,
  isLoading = false
}) => {
  // Drag and drop désactivé temporairement
  // const { isOver, setNodeRef } = useDroppable({
  //   id: stage,
  // });
  const isOver = false;

  const palette = useMemo(() => {
    switch (stage) {
      case 'nouveau': return { headerBg: 'bg-blue-50', headerText: 'text-blue-800', bodyBg: 'bg-blue-50/40', border: 'border-blue-200', stripe: 'border-l-blue-400' };
      case 'qualification': return { headerBg: 'bg-yellow-50', headerText: 'text-yellow-800', bodyBg: 'bg-yellow-50/40', border: 'border-yellow-200', stripe: 'border-l-yellow-400' };
      case 'proposition_envoyee': return { headerBg: 'bg-purple-50', headerText: 'text-purple-800', bodyBg: 'bg-purple-50/40', border: 'border-purple-200', stripe: 'border-l-purple-400' };
      case 'negociation': return { headerBg: 'bg-orange-50', headerText: 'text-orange-800', bodyBg: 'bg-orange-50/40', border: 'border-orange-200', stripe: 'border-l-orange-400' };
      case 'converti': return { headerBg: 'bg-green-50', headerText: 'text-green-800', bodyBg: 'bg-green-50/40', border: 'border-green-200', stripe: 'border-l-green-400' };
      case 'perdu': return { headerBg: 'bg-red-50', headerText: 'text-red-800', bodyBg: 'bg-red-50/40', border: 'border-red-200', stripe: 'border-l-red-400' };
      default: return { headerBg: 'bg-gray-50', headerText: 'text-gray-800', bodyBg: 'bg-gray-50', border: 'border-gray-200', stripe: 'border-l-gray-300' };
    }
  }, [stage]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const totalAmount = useMemo(() => 
    opportunities.reduce((sum, opp) => sum + opp.amount, 0),
    [opportunities]
  );

  const OpportunityCard: React.FC<{ opportunity: Opportunity }> = ({ opportunity }) => {
    // Drag and drop désactivé temporairement
    // const {
    //   attributes,
    //   listeners,
    //   setNodeRef: setDragRef,
    //   transform,
    //   isDragging,
    // } = useDraggable({
    //   id: opportunity.id,
    //   disabled: false,
    // });

    // const style = transform ? {
    //   transform: CSS.Translate.toString(transform),
    // } : undefined;
    const isDragging = false;

    const stripeClass = palette.stripe;

    const daysUntilClose = opportunity.expected_close_date 
      ? Math.ceil((new Date(opportunity.expected_close_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const isOverdue = daysUntilClose !== null && daysUntilClose < 0;

    return (
      <Card
        className={`
          p-3 bg-white rounded-lg shadow-sm relative border border-gray-200
          hover:shadow-md transition-all duration-150
          ${isDragging ? 'opacity-50 shadow-lg' : ''}
          border-l-4 ${stripeClass}
        `}
        onDoubleClick={() => onEditOpportunity(opportunity)}
      >
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold text-gray-900 truncate">
                {opportunity.name}
              </CardTitle>
              {opportunity.company && (
                <div className="flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-600 truncate">{opportunity.company.name}</span>
                </div>
              )}
              {opportunity.contact && (
                <div className="flex items-center gap-1 mt-1">
                  <User className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-600 truncate">{opportunity.contact.name}</span>
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEditOpportunity(opportunity)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Déplacer vers
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    {stages.filter(s => s.value !== stage).map(targetStage => (
                      <DropdownMenuItem
                        key={targetStage.value}
                        onClick={() => onMoveOpportunity(opportunity.id, targetStage.value)}
                      >
                        {targetStage.value === 'converti' && <CheckCircle className="mr-2 h-4 w-4 text-green-600" />}
                        {targetStage.value === 'perdu' && <XCircle className="mr-2 h-4 w-4 text-red-600" />}
                        {targetStage.value !== 'converti' && targetStage.value !== 'perdu' && <ArrowRight className="mr-2 h-4 w-4" />}
                        {targetStage.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDeleteOpportunity(opportunity.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-gray-400" />
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(opportunity.amount)}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {opportunity.probability}%
            </Badge>
          </div>

          {opportunity.expected_close_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                {isOverdue 
                  ? `${Math.abs(daysUntilClose)} jours de retard`
                  : daysUntilClose === 0 
                    ? "Aujourd'hui"
                    : `${daysUntilClose} jours`
                }
              </span>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <Card
      className={`
        w-80 min-w-[20rem] flex-shrink-0 flex flex-col border ${palette.border}
        rounded-lg shadow-sm transition-all
        ${isOver ? 'ring-2 ring-blue-400' : ''}
      `}
      aria-label={`Colonne ${stageLabel}`}
    >
      <CardHeader className={`py-3 px-4 border-b ${palette.headerBg}`}>
        <div className="flex justify-between items-center">
          <CardTitle className={`text-md font-bold ${palette.headerText}`}>{stageLabel}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white border border-gray-300 text-gray-700">
              {opportunities.length}
            </Badge>
          </div>
        </div>
        {totalAmount > 0 && (
          <div className="mt-2 text-sm font-medium text-gray-700">
            Total: {formatCurrency(totalAmount)}
          </div>
        )}
      </CardHeader>

      <CardContent className={`p-3 flex-1 overflow-hidden ${palette.bodyBg}`}>
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto pr-2"
          style={{ maxHeight: `${columnHeight}px` }}
          role="list"
        >
          <div className="space-y-3">
            {opportunities.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <ArrowLeft className="mb-2" /> Glissez-déposez des opportunités ici
              </div>
            ) : (
              opportunities.map(opp => (
                <div role="listitem" key={opp.id}>
                  <OpportunityCard opportunity={opp} />
                </div>
              ))
            )}

            {isLoading && <div className="text-center text-sm text-gray-500 py-2">Chargement...</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpportunityKanbanColumn;