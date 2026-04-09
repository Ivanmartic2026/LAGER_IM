import { useState } from 'react';
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
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    dot: 'bg-blue-500',
    label: 'Kommentar'
  },
  system: {
    icon: Settings,
    color: 'text-white/40',
    bg: 'bg-white/5 border-white/10',
    dot: 'bg-white/40',
    label: 'System'
  },
  decision: {
    icon: Gavel,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Beslut'
  },
  assignment: {
    icon: UserCheck,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    dot: 'bg-purple-500',
    label: 'Tilldelning'
  },
  file_upload: {
    icon: Upload,
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
    dot: 'bg-green-500',
    label: 'Fil'
  },
  status_change: {
    icon: ArrowRightLeft,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    dot: 'bg-orange-500',
    label: 'Statusändring'
  },
  field_change: {
    icon: Edit3,
    color: 'text-white/50',
    bg: 'bg-white/5 border-white/10',
    dot: 'bg-white/40',
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
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center border border-white/10 flex-shrink-0', isDecision ? 'bg-amber-500/20' : 'bg-white/5')}>
          <Icon className={cn('w-4 h-4', config.color)} />
        </div>
        <div className="w-px bg-white/10 flex-1 mt-1 min-h-[8px]" />
      </div>

      {/* Content */}
      <div className={cn('flex-1 pb-4 rounded-lg border p-3 mb-1', config.bg, isDecision && 'ring-1 ring-amber-400/50')}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-white">
              {activity.actor_name || activity.actor_email || 'System'}
            </span>
            <Badge variant="outline" className={cn('text-xs border-white/10 py-0 bg-transparent', config.color)}>
              {config.label}
            </Badge>
            {isDecision && (
              <Badge className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 py-0">
                <Star className="w-3 h-3 mr-1" /> Beslut
              </Badge>
            )}
          </div>
          <span className="text-xs text-white/30 whitespace-nowrap flex-shrink-0">
            {new Date(activity.created_date).toLocaleString('sv-SE', {
              timeZone: 'Europe/Stockholm',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        <p className="text-sm text-white/70">{activity.message}</p>

        {/* Field change diff */}
        {activity.field_name && (activity.old_value || activity.new_value) && (
          <div className="mt-2 flex items-center gap-2 text-xs bg-white/5 rounded px-2 py-1 border border-white/10">
            <span className="text-white/40">{activity.field_name}:</span>
            {activity.old_value && (
              <span className="line-through text-red-400/70">{activity.old_value}</span>
            )}
            {activity.old_value && activity.new_value && <span className="text-white/30">→</span>}
            {activity.new_value && (
              <span className="font-medium text-green-400">{activity.new_value}</span>
            )}
          </div>
        )}

        {/* Decision reason */}
        {activity.decision_reason && (
          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
            <strong>Motivering:</strong> {activity.decision_reason}
          </div>
        )}

        {/* File link */}
        {activity.file_url && (
          <a
            href={activity.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:underline"
          >
            <Upload className="w-3 h-3" />
            {activity.file_name || 'Visa fil'}
          </a>
        )}
      </div>
    </div>
  );
}

// Batch consecutive "system" status_change activities within 2 minutes
function batchSystemChanges(activities) {
  const batched = [];
  let i = 0;
  while (i < activities.length) {
    const curr = activities[i];
    if (curr.type === 'system' || (curr.type === 'status_change' && curr.actor_email === 'System')) {
      const batch = [curr];
      let j = i + 1;
      while (j < activities.length) {
        const next = activities[j];
        if ((next.type === 'system' || (next.type === 'status_change' && next.actor_email === 'System')) &&
            (new Date(curr.created_date) - new Date(next.created_date)) < 120000) {
          batch.push(next);
          j++;
        } else break;
      }
      if (batch.length > 1) {
        batched.push({
          type: 'system_batch',
          created_date: batch[0].created_date,
          activities: batch,
          id: batch[0].id + '_batch'
        });
        i = j;
      } else {
        batched.push(curr);
        i++;
      }
    } else {
      batched.push(curr);
      i++;
    }
  }
  return batched;
}

export default function ActivityFeed({ entityType, entityId, logFunctionName, idField }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState(null);

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
        type: 'comment',
        message: comment,
      };
      return base44.functions.invoke(logFunctionName, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, entityId] });
      setComment('');
    },
  });

  const batchedActivities = batchSystemChanges(activities);
  const displayed = showAll ? batchedActivities : batchedActivities.slice(0, 10);
  const hasMore = batchedActivities.length > 10;

  return (
    <div className="space-y-4">
      {/* Comment input */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
        <Textarea
          placeholder="Skriv en kommentar, anteckning eller beslut..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-[80px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm focus:border-blue-500/50"
        />

        <div className="flex items-center justify-end mt-3 gap-3 flex-wrap">
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
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {isLoading ? (
          <div className="text-center py-8 text-white/30 text-sm">Laddar aktiviteter...</div>
        ) : batchedActivities.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">Inga aktiviteter ännu</div>
        ) : (
          <>
            {displayed.map((batch) => {
              if (batch.type === 'system_batch') {
                const isExpanded = expandedBatch === batch.id;
                return (
                  <div key={batch.id} className="mb-2">
                    <button
                      onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                      className="w-full text-left text-xs bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/8 transition-colors flex items-center justify-between"
                    >
                      <span className="text-white/60">📋 System: {batch.activities.length} systemändringar</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {isExpanded && (
                      <div className="ml-3 mt-1 space-y-0 border-l border-white/10 pl-3">
                        {batch.activities.map(act => (
                          <ActivityItem key={act.id} activity={act} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return <ActivityItem key={batch.id} activity={batch} />;
            })}
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 mx-auto"
              >
                {showAll ? <><ChevronUp className="w-3 h-3" /> Visa färre</> : <><ChevronDown className="w-3 h-3" /> Visa alla {batchedActivities.length} händelser</>}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}