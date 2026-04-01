import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MessageSquare, Settings, Gavel, UserCheck, Upload,
  ArrowRightLeft, Edit3, ChevronDown, ChevronUp, Star, Send, Loader2
} from 'lucide-react';

const TYPE_CONFIG = {
  comment: {
    icon: MessageSquare,
    color: 'text-blue-500',
    bg: 'bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
    label: 'Kommentar'
  },
  system: {
    icon: Settings,
    color: 'text-gray-400',
    bg: 'bg-gray-50 border-gray-200',
    dot: 'bg-gray-400',
    label: 'System'
  },
  decision: {
    icon: Gavel,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-300',
    dot: 'bg-amber-500',
    label: 'Beslut'
  },
  assignment: {
    icon: UserCheck,
    color: 'text-purple-500',
    bg: 'bg-purple-50 border-purple-200',
    dot: 'bg-purple-500',
    label: 'Tilldelning'
  },
  file_upload: {
    icon: Upload,
    color: 'text-green-500',
    bg: 'bg-green-50 border-green-200',
    dot: 'bg-green-500',
    label: 'Fil'
  },
  status_change: {
    icon: ArrowRightLeft,
    color: 'text-orange-500',
    bg: 'bg-orange-50 border-orange-200',
    dot: 'bg-orange-500',
    label: 'Statusändring'
  },
  field_change: {
    icon: Edit3,
    color: 'text-slate-500',
    bg: 'bg-slate-50 border-slate-200',
    dot: 'bg-slate-400',
    label: 'Ändring'
  },
};

function ActivityItem({ activity }) {
  const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.system;
  const Icon = config.icon;
  const isDecision = activity.is_decision;

  return (
    <div className={cn('flex gap-3 group', isDecision && 'relative')}>
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0', isDecision ? 'bg-amber-100' : 'bg-white')}>
          <Icon className={cn('w-4 h-4', config.color)} />
        </div>
        <div className="w-px bg-gray-200 flex-1 mt-1 min-h-[8px]" />
      </div>

      {/* Content */}
      <div className={cn('flex-1 pb-4 rounded-lg border p-3 mb-1', config.bg, isDecision && 'ring-2 ring-amber-400 ring-offset-1')}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">
              {activity.actor_name || activity.actor_email || 'System'}
            </span>
            <Badge variant="outline" className={cn('text-xs border py-0', config.color)}>
              {config.label}
            </Badge>
            {isDecision && (
              <Badge className="text-xs bg-amber-500 text-white py-0">
                <Star className="w-3 h-3 mr-1" /> Beslut
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
            {format(new Date(activity.created_date), 'd MMM HH:mm', { locale: sv })}
          </span>
        </div>

        <p className="text-sm text-gray-700">{activity.message}</p>

        {/* Field change diff */}
        {activity.field_name && (activity.old_value || activity.new_value) && (
          <div className="mt-2 flex items-center gap-2 text-xs bg-white/60 rounded px-2 py-1 border border-white/80">
            <span className="text-gray-500">{activity.field_name}:</span>
            {activity.old_value && (
              <span className="line-through text-red-400">{activity.old_value}</span>
            )}
            {activity.old_value && activity.new_value && <span className="text-gray-400">→</span>}
            {activity.new_value && (
              <span className="font-medium text-green-700">{activity.new_value}</span>
            )}
          </div>
        )}

        {/* Decision reason */}
        {activity.decision_reason && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            <strong>Motivering:</strong> {activity.decision_reason}
          </div>
        )}

        {/* File link */}
        {activity.file_url && (
          <a
            href={activity.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <Upload className="w-3 h-3" />
            {activity.file_name || 'Visa fil'}
          </a>
        )}
      </div>
    </div>
  );
}

export default function ActivityFeed({ entityType, entityId, logFunctionName, idField }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [isDecision, setIsDecision] = useState(false);
  const [decisionReason, setDecisionReason] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Determine which entity to query
  const entityMap = {
    POActivity: base44.entities.POActivity,
    ProductionActivity: base44.entities.ProductionActivity,
    WorkOrderActivity: base44.entities.WorkOrderActivity,
  };
  const entity = entityMap[entityType];

  const filterMap = {
    POActivity: { purchase_order_id: entityId },
    ProductionActivity: { order_id: entityId },
    WorkOrderActivity: { work_order_id: entityId },
  };

  const { data: activities = [], isLoading } = useQuery({
    queryKey: [entityType, entityId],
    queryFn: () => entity.filter(filterMap[entityType], '-created_date', 100),
    enabled: !!entityId,
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const payload = {
        [idField]: entityId,
        type: isDecision ? 'decision' : 'comment',
        message: comment,
        is_decision: isDecision,
        decision_reason: isDecision ? decisionReason : null,
      };
      return base44.functions.invoke(logFunctionName, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, entityId] });
      setComment('');
      setIsDecision(false);
      setDecisionReason('');
    },
  });

  const displayed = showAll ? activities : activities.slice(0, 10);
  const hasMore = activities.length > 10;

  return (
    <div className="space-y-4">
      {/* Comment input */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <Textarea
          placeholder="Skriv en kommentar, anteckning eller beslut..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-[80px] resize-none border-gray-200 text-sm"
        />

        <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDecision}
              onChange={(e) => setIsDecision(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Gavel className="w-3.5 h-3.5 text-amber-500" />
              Markera som beslut
            </span>
          </label>

          <Button
            size="sm"
            onClick={() => addComment.mutate()}
            disabled={!comment.trim() || addComment.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Skicka
          </Button>
        </div>

        {isDecision && (
          <div className="mt-3">
            <Textarea
              placeholder="Motivering till beslutet (valfritt)..."
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              className="min-h-[60px] resize-none border-amber-300 bg-amber-50 text-sm"
            />
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Laddar aktiviteter...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Inga aktiviteter ännu</div>
        ) : (
          <>
            {displayed.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto"
              >
                {showAll ? <><ChevronUp className="w-3 h-3" /> Visa färre</> : <><ChevronDown className="w-3 h-3" /> Visa alla {activities.length} händelser</>}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}