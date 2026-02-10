'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Star,
  RefreshCw,
  ChevronRight,
  Zap,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Review {
  id: string;
  platform: string;
  reviewText: string;
  rating: number;
  reviewerName?: string;
  reviewTimestamp: string;
  contentRisk: string;
  reputationalRisk: string;
  contextualRisk: string;
  decision: string;
  confidenceScore: number;
  status: string;
  generatedResponse?: string;
}

export default function QueuePage() {
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [escalatedReviews, setEscalatedReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const fetchQueues = useCallback(async () => {
    try {
      const [pendingRes, escalatedRes] = await Promise.all([
        fetch('/api/reviews?status=pending_approval'),
        fetch('/api/reviews?decision=ESCALATE_TO_HUMAN'),
      ]);
      
      if (pendingRes?.ok) {
        const data = await pendingRes?.json?.() ?? {};
        setPendingReviews(data?.reviews ?? []);
      }
      if (escalatedRes?.ok) {
        const data = await escalatedRes?.json?.() ?? {};
        setEscalatedReviews(data?.reviews ?? []);
      }
    } catch (error) {
      console.error('Error fetching queues:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchQueues?.();
  }, [fetchQueues]);
  
  const handleAction = async (reviewId: string, action: 'approve' | 'reject' | 'escalate') => {
    try {
      const statusMap: Record<string, string> = {
        approve: 'approved',
        reject: 'archived',
        escalate: 'escalated',
      };
      
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusMap[action] ?? 'pending_approval',
          humanActionTaken: action,
        }),
      });
      
      if (response?.ok) {
        toast?.success?.(`Review ${action}d successfully`);
        fetchQueues?.();
      } else {
        toast?.error?.(`Failed to ${action} review`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast?.error?.(`Failed to ${action} review`);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  const ReviewCard = ({ review, showEscalate = false }: { review: Review; showEscalate?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)]?.map?.((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < Math.round((review?.rating ?? 0) / 2) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{review?.rating ?? 0}/10</span>
                  <Badge variant="outline">{review?.reviewerName ?? 'Anonymous'}</Badge>
                </div>
                <p className="text-gray-700 line-clamp-3">{review?.reviewText ?? 'No review text'}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(review?.reviewTimestamp ?? Date?.now?.())?.toLocaleDateString?.()}
                </p>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                {review?.decision === 'ESCALATE_TO_HUMAN' && (
                  <Badge variant="danger" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Escalated
                  </Badge>
                )}
                {review?.decision === 'HOLD_FOR_APPROVAL' && (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Pending
                  </Badge>
                )}
                <span className="text-xs text-gray-500">{review?.confidenceScore ?? 0}% confidence</span>
              </div>
            </div>
            
            {review?.generatedResponse && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Suggested Response:</span><br />
                  {review.generatedResponse}
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between border-t pt-3">
              <Button variant="ghost" size="sm" onClick={() => router?.push?.(`/dashboard/reviews/${review?.id}`)}>
                View Details <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleAction?.(review?.id, 'reject')}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                {showEscalate && (
                  <Button variant="outline" size="sm" onClick={() => handleAction?.(review?.id, 'escalate')}>
                    <AlertTriangle className="h-4 w-4 mr-1" /> Escalate
                  </Button>
                )}
                <Button size="sm" onClick={() => handleAction?.(review?.id, 'approve')}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
        <p className="text-gray-600">Review and approve AI-processed reviews</p>
      </div>
      
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Approval
            {(pendingReviews?.length ?? 0) > 0 && (
              <Badge variant="warning" className="ml-1">{pendingReviews?.length ?? 0}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="escalated" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Escalated
            {(escalatedReviews?.length ?? 0) > 0 && (
              <Badge variant="danger" className="ml-1">{escalatedReviews?.length ?? 0}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-4">
          {(pendingReviews?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All caught up!</h3>
                <p className="text-gray-500">No reviews pending approval</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingReviews?.map?.((review) => (
                <ReviewCard key={review?.id} review={review} showEscalate />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="escalated" className="mt-4">
          {(escalatedReviews?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">No escalations</h3>
                <p className="text-gray-500">All high-risk reviews have been handled</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">
                    {escalatedReviews?.length ?? 0} reviews require immediate attention
                  </span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  These reviews have been flagged as high risk by the AI system.
                </p>
              </div>
              {escalatedReviews?.map?.((review) => (
                <ReviewCard key={review?.id} review={review} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
