'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Star,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  RefreshCw,
  Filter,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Review {
  id: string;
  externalId?: string;
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

const riskColors: Record<string, string> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
};

const decisionIcons: Record<string, React.ReactNode> = {
  AUTO_HANDLE: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  HOLD_FOR_APPROVAL: <Clock className="h-4 w-4 text-yellow-600" />,
  ESCALATE_TO_HUMAN: <AlertTriangle className="h-4 w-4 text-red-600" />,
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();
  
  const fetchReviews = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params?.append?.('status', statusFilter);
      if (decisionFilter && decisionFilter !== 'all') params?.append?.('decision', decisionFilter);
      
      const response = await fetch(`/api/reviews?${params?.toString?.() ?? ''}`);
      if (response?.ok) {
        const data = await response?.json?.() ?? {};
        setReviews(data?.reviews ?? []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, decisionFilter]);
  
  useEffect(() => {
    fetchReviews?.();
  }, [fetchReviews]);
  
  const handleProcess = async (reviewId: string) => {
    setProcessingId(reviewId);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/process`, {
        method: 'POST',
      });
      
      if (!response?.ok) {
        throw new Error('Processing failed');
      }
      
      const reader = response?.body?.getReader?.();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response stream');
      }
      
      while (true) {
        const { done, value } = await reader?.read?.() ?? { done: true, value: undefined };
        if (done) break;
        
        const chunk = decoder?.decode?.(value, { stream: true }) ?? '';
        const lines = chunk?.split?.('\n') ?? [];
        
        for (const line of lines) {
          if (line?.startsWith?.('data: ')) {
            const data = line?.slice?.(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data ?? '{}');
              if (parsed?.status === 'error') {
                toast?.error?.(parsed?.message ?? 'Processing failed');
              } else if (parsed?.final) {
                toast?.success?.('Review processed successfully');
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
      
      fetchReviews?.();
    } catch (error) {
      console.error('Error processing review:', error);
      toast?.error?.('Failed to process review');
    } finally {
      setProcessingId(null);
    }
  };
  
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
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-600">View and manage all reviews</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="pending_approval">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="responded">Responded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={decisionFilter} onValueChange={setDecisionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Decision" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Decisions</SelectItem>
              <SelectItem value="AUTO_HANDLE">Auto Handle</SelectItem>
              <SelectItem value="HOLD_FOR_APPROVAL">Hold for Approval</SelectItem>
              <SelectItem value="ESCALATE_TO_HUMAN">Escalate</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => fetchReviews?.()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {(reviews?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No reviews found</h3>
            <p className="text-gray-500 mt-1">Fetch reviews from Kiyoh to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews?.map?.((review, index) => (
            <motion.div
              key={review?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router?.push?.(`/dashboard/reviews/${review?.id}`)}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center">
                          {[...Array(5)]?.map?.((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < Math.round((review?.rating ?? 0) / 2) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{review?.rating ?? 0}/10</span>
                        <Badge variant="outline" className="capitalize">{review?.platform ?? 'unknown'}</Badge>
                        <span className="text-sm text-gray-500">{review?.reviewerName ?? 'Anonymous'}</span>
                      </div>
                      <p className="text-gray-700 line-clamp-2">{review?.reviewText ?? 'No review text'}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(review?.reviewTimestamp ?? Date?.now?.()).toLocaleDateString?.()}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Risk indicators */}
                      <div className="flex gap-1">
                        <Badge variant={(riskColors[review?.contentRisk ?? 'Low'] ?? 'secondary') as 'success' | 'warning' | 'danger' | 'secondary'}>
                          C:{review?.contentRisk?.[0] ?? 'L'}
                        </Badge>
                        <Badge variant={(riskColors[review?.reputationalRisk ?? 'Low'] ?? 'secondary') as 'success' | 'warning' | 'danger' | 'secondary'}>
                          R:{review?.reputationalRisk?.[0] ?? 'L'}
                        </Badge>
                        <Badge variant={(riskColors[review?.contextualRisk ?? 'Low'] ?? 'secondary') as 'success' | 'warning' | 'danger' | 'secondary'}>
                          X:{review?.contextualRisk?.[0] ?? 'L'}
                        </Badge>
                      </div>
                      
                      {/* Decision */}
                      <div className="flex items-center gap-1">
                        {decisionIcons[review?.decision ?? 'HOLD_FOR_APPROVAL']}
                        <span className="text-xs font-medium">
                          {review?.decision?.replace?.(/_/g, ' ') ?? 'Pending'}
                        </span>
                      </div>
                      
                      {/* Confidence */}
                      {(review?.confidenceScore ?? 0) > 0 && (
                        <Badge variant="outline">{review?.confidenceScore ?? 0}%</Badge>
                      )}
                      
                      {/* Actions */}
                      {review?.status === 'new' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e?.stopPropagation?.();
                            handleProcess?.(review?.id);
                          }}
                          disabled={processingId === review?.id}
                        >
                          {processingId === review?.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Zap className="h-3 w-3 mr-1" />
                              Process
                            </>
                          )}
                        </Button>
                      )}
                      
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
