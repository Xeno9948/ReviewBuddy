'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Zap,
  Send,
  Edit3,
  FileText,
  Shield,
  User,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface ReviewDetail {
  id: string;
  externalId?: string;
  platform: string;
  reviewText: string;
  oneLiner?: string;
  rating: number;
  reviewerName?: string;
  reviewerCity?: string;
  reviewTimestamp: string;
  contentRisk: string;
  reputationalRisk: string;
  contextualRisk: string;
  piiDetected: boolean;
  legalRiskDetected: boolean;
  riskAssessmentJson?: string;
  decision: string;
  confidenceScore: number;
  decisionRationale?: string;
  generatedResponse?: string;
  responseStatus: string;
  status: string;
  humanNotes?: string;
  humanActionTaken?: string;
  auditLogs: Array<{
    id: string;
    actionType: string;
    createdAt: string;
    decision?: string;
  }>;
}

interface ProcessStep {
  step: number;
  status: string;
  message: string;
  data?: unknown;
  final?: boolean;
  result?: unknown;
}

const riskColors: Record<string, string> = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-red-100 text-red-800',
};

export default function ReviewDetailPage() {
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [editedResponse, setEditedResponse] = useState('');
  const [publishing, setPublishing] = useState(false);
  const router = useRouter();
  const params = useParams();
  const reviewId = params?.id as string;
  
  const fetchReview = useCallback(async () => {
    if (!reviewId) return;
    try {
      const response = await fetch(`/api/reviews/${reviewId}`);
      if (response?.ok) {
        const data = await response?.json?.() ?? {};
        setReview(data);
        setEditedResponse(data?.generatedResponse ?? '');
      }
    } catch (error) {
      console.error('Error fetching review:', error);
    } finally {
      setLoading(false);
    }
  }, [reviewId]);
  
  useEffect(() => {
    fetchReview?.();
  }, [fetchReview]);
  
  const handleProcess = async () => {
    setProcessing(true);
    setProcessSteps([]);
    
    try {
      const response = await fetch(`/api/reviews/${reviewId}/process`, {
        method: 'POST',
      });
      
      if (!response?.ok) {
        throw new Error('Processing failed');
      }
      
      const reader = response?.body?.getReader?.();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('No response stream');
      
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
              const parsed = JSON.parse(data ?? '{}') as ProcessStep;
              setProcessSteps(prev => {
                const existing = (prev ?? [])?.findIndex?.(p => p?.step === parsed?.step);
                if (existing >= 0) {
                  const newSteps = [...(prev ?? [])];
                  newSteps[existing] = parsed;
                  return newSteps;
                }
                return [...(prev ?? []), parsed];
              });
              
              if (parsed?.status === 'error') {
                toast?.error?.(parsed?.message ?? 'Processing failed');
              } else if (parsed?.final) {
                toast?.success?.('Review processed successfully');
                fetchReview?.();
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing review:', error);
      toast?.error?.('Failed to process review');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleUpdateResponse = async () => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatedResponse: editedResponse }),
      });
      
      if (response?.ok) {
        toast?.success?.('Response updated');
        fetchReview?.();
      } else {
        toast?.error?.('Failed to update response');
      }
    } catch (error) {
      console.error('Error:', error);
      toast?.error?.('Failed to update response');
    }
  };
  
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseType: 'PUBLIC', sendEmail: false }),
      });
      
      const data = await response?.json?.() ?? {};
      
      if (response?.ok) {
        toast?.success?.('Response published to Kiyoh!');
        fetchReview?.();
      } else {
        toast?.error?.(data?.error ?? 'Failed to publish');
      }
    } catch (error) {
      console.error('Error:', error);
      toast?.error?.('Failed to publish response');
    } finally {
      setPublishing(false);
    }
  };
  
  const handleApprove = async () => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', humanActionTaken: 'approved' }),
      });
      
      if (response?.ok) {
        toast?.success?.('Review approved');
        fetchReview?.();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (!review) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Review not found</h2>
        <Button className="mt-4" onClick={() => router?.push?.('/dashboard/reviews')}>Back to Reviews</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router?.push?.('/dashboard/reviews')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Reviews
      </Button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Review Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Review Details
                  </CardTitle>
                  <Badge variant="outline" className="capitalize">{review?.platform ?? 'unknown'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    {[...Array(5)]?.map?.((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < Math.round((review?.rating ?? 0) / 2) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold">{review?.rating ?? 0}/10</span>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {review?.reviewerName ?? 'Anonymous'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(review?.reviewTimestamp ?? Date?.now?.())?.toLocaleDateString?.()}
                  </div>
                </div>
                
                {review?.oneLiner && (
                  <p className="text-lg font-medium italic">&quot;{review.oneLiner}&quot;</p>
                )}
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{review?.reviewText ?? 'No review text'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Response Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-blue-600" />
                  Generated Response
                </CardTitle>
                <CardDescription>AI-generated response based on your brand tone</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={editedResponse}
                  onChange={(e) => setEditedResponse(e?.target?.value ?? '')}
                  rows={5}
                  placeholder="No response generated yet. Process the review to generate one."
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleUpdateResponse} disabled={editedResponse === review?.generatedResponse}>
                    <Edit3 className="h-4 w-4 mr-2" /> Save Changes
                  </Button>
                  <Button
                    onClick={handlePublish}
                    disabled={!review?.generatedResponse || !review?.externalId || publishing || review?.responseStatus === 'published'}
                  >
                    {publishing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {review?.responseStatus === 'published' ? 'Published' : 'Publish to Kiyoh'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Processing Steps */}
          {(processSteps?.length ?? 0) > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Processing Pipeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {processSteps?.map?.((step) => (
                    <div key={step?.step} className="flex items-center gap-3">
                      {step?.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : step?.status === 'processing' ? (
                        <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400" />
                      )}
                      <span className={step?.status === 'completed' ? 'text-green-700' : ''}>
                        Step {step?.step}: {step?.message}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {review?.status === 'new' && (
                  <Button className="w-full" onClick={handleProcess} disabled={processing}>
                    {processing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Process with AI
                  </Button>
                )}
                {review?.status === 'pending_approval' && (
                  <Button className="w-full" variant="default" onClick={handleApprove}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                  </Button>
                )}
                <div className="text-sm text-gray-500">
                  Status: <Badge variant="outline" className="ml-1 capitalize">{review?.status?.replace?.(/_/g, ' ') ?? 'unknown'}</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Risk Assessment */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Content Risk</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${riskColors[review?.contentRisk ?? 'Low'] ?? ''}`}>
                      {review?.contentRisk ?? 'Low'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Reputational Risk</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${riskColors[review?.reputationalRisk ?? 'Low'] ?? ''}`}>
                      {review?.reputationalRisk ?? 'Low'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Contextual Risk</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${riskColors[review?.contextualRisk ?? 'Low'] ?? ''}`}>
                      {review?.contextualRisk ?? 'Low'}
                    </span>
                  </div>
                </div>
                
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center gap-2">
                    {review?.piiDetected ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    <span className="text-sm">PII {review?.piiDetected ? 'Detected' : 'Not Detected'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {review?.legalRiskDetected ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    <span className="text-sm">Legal Risk {review?.legalRiskDetected ? 'Detected' : 'Not Detected'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Decision */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader>
                <CardTitle>AI Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-3 rounded-lg ${
                  review?.decision === 'AUTO_HANDLE' ? 'bg-green-50' :
                  review?.decision === 'HOLD_FOR_APPROVAL' ? 'bg-yellow-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center gap-2">
                    {review?.decision === 'AUTO_HANDLE' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : review?.decision === 'HOLD_FOR_APPROVAL' ? (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {review?.decision?.replace?.(/_/g, ' ') ?? 'Pending'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Confidence</span>
                    <span className="font-medium">{review?.confidenceScore ?? 0}%</span>
                  </div>
                  <Progress value={review?.confidenceScore ?? 0} className="h-2" />
                </div>
                
                {review?.decisionRationale && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Rationale:</span>
                    <p className="mt-1">{review.decisionRationale}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Audit Trail */}
          {(review?.auditLogs?.length ?? 0) > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Audit Trail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {review?.auditLogs?.slice?.(0, 5)?.map?.((log) => (
                      <div key={log?.id} className="text-sm border-l-2 border-blue-200 pl-3">
                        <div className="font-medium">{log?.actionType?.replace?.(/_/g, ' ') ?? 'Action'}</div>
                        <div className="text-gray-500 text-xs">
                          {new Date(log?.createdAt ?? Date?.now?.())?.toLocaleString?.()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
