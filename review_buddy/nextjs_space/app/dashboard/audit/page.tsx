'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  RefreshCw,
  Filter,
  Clock,
  User,
  MessageSquare,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AuditLog {
  id: string;
  reviewId?: string;
  actionType: string;
  decision?: string;
  confidenceScore?: number;
  humanUserId?: string;
  createdAt: string;
  metadata?: string;
  review?: {
    id: string;
    reviewText: string;
    reviewerName?: string;
    platform: string;
  };
}

const actionIcons: Record<string, React.ReactNode> = {
  REVIEW_PROCESSED: <Zap className="h-4 w-4 text-blue-600" />,
  REVIEW_UPDATED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  RESPONSE_PUBLISHED: <Send className="h-4 w-4 text-purple-600" />,
  REVIEWS_FETCHED: <RefreshCw className="h-4 w-4 text-orange-600" />,
  SETTINGS_UPDATED: <Settings className="h-4 w-4 text-gray-600" />,
  INVITE_SENT: <MessageSquare className="h-4 w-4 text-green-600" />,
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params?.append?.('page', page?.toString?.() ?? '1');
      params?.append?.('limit', '50');
      if (actionFilter && actionFilter !== 'all') params?.append?.('actionType', actionFilter);
      
      const response = await fetch(`/api/audit-logs?${params?.toString?.() ?? ''}`);
      if (response?.ok) {
        const data = await response?.json?.() ?? {};
        setLogs(data?.logs ?? []);
        setTotalPages(data?.totalPages ?? 1);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);
  
  useEffect(() => {
    fetchLogs?.();
  }, [fetchLogs]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">Complete history of all system actions</p>
        </div>
        <div className="flex gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="REVIEW_PROCESSED">Review Processed</SelectItem>
              <SelectItem value="REVIEW_UPDATED">Review Updated</SelectItem>
              <SelectItem value="RESPONSE_PUBLISHED">Response Published</SelectItem>
              <SelectItem value="REVIEWS_FETCHED">Reviews Fetched</SelectItem>
              <SelectItem value="SETTINGS_UPDATED">Settings Updated</SelectItem>
              <SelectItem value="INVITE_SENT">Invite Sent</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => fetchLogs?.()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {(logs?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">No audit logs found</h3>
            <p className="text-gray-500">System actions will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs?.map?.((log, index) => (
            <motion.div
              key={log?.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {actionIcons[log?.actionType ?? ''] ?? <FileText className="h-4 w-4" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {log?.actionType?.replace?.(/_/g, ' ') ?? 'Action'}
                        </span>
                        {log?.decision && (
                          <Badge
                            variant={
                              log.decision === 'AUTO_HANDLE' ? 'success' :
                              log.decision === 'HOLD_FOR_APPROVAL' ? 'warning' : 'danger'
                            }
                          >
                            {log.decision?.replace?.(/_/g, ' ')}
                          </Badge>
                        )}
                        {(log?.confidenceScore ?? 0) > 0 && (
                          <Badge variant="outline">{log?.confidenceScore ?? 0}% confidence</Badge>
                        )}
                      </div>
                      
                      {log?.review && (
                        <p className="text-sm text-gray-600 line-clamp-1">
                          Review by {log.review?.reviewerName ?? 'Anonymous'}: "{log.review?.reviewText?.substring?.(0, 100) ?? '...'}..."
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log?.createdAt ?? Date?.now?.())?.toLocaleString?.()}
                        </div>
                        {log?.humanUserId && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Human action
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, (p ?? 1) - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, (p ?? 1) + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
