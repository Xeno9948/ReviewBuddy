'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Star,
  ArrowRight,
  Send,
  TrendingUp,
  PieChart as PieChartIcon,
  Tag,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DashboardStats {
  overview: {
    totalReviews: number;
    autoHandled: number;
    holdForApproval: number;
    escalated: number;
    responded: number;
    avgConfidenceScore: number;
    avgRating: string;
  };
  queues: {
    newReviews: number;
    pendingApproval: number;
    escalated: number;
  };
  systemHealth: {
    escalationRate: number;
    overrideFrequency: number;
    avgConfidenceScore: number;
    alertTriggered: boolean;
    alertMessage: string | null;
  };
  charts: {
    decisionDistribution: { name: string; value: number }[];
    ratingDistribution: { rating: number; count: number }[];
    sentimentDistribution: { name: string; value: number }[];
    topTopics: { name: string; count: number }[];
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingReviews, setFetchingReviews] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response?.ok) {
        const data = await response?.json?.() ?? {};
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats?.();
  }, []);

  const handleFetchReviews = async () => {
    setFetchingReviews(true);
    try {
      const response = await fetch('/api/reviews/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 }),
      });

      const data = await response?.json?.() ?? {};

      if (response?.ok) {
        toast?.success?.(`Fetched ${data?.fetched ?? 0} reviews (${data?.imported?.new ?? 0} new, ${data?.imported?.updated ?? 0} updated)`);
        fetchStats?.();
      } else {
        toast?.error?.(data?.error ?? 'Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error:', error);
      toast?.error?.('Failed to fetch reviews');
    } finally {
      setFetchingReviews(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const overview = stats?.overview ?? {
    totalReviews: 0,
    autoHandled: 0,
    holdForApproval: 0,
    escalated: 0,
    responded: 0,
    avgConfidenceScore: 0,
    avgRating: '0.0',
  };

  const queues = stats?.queues ?? { newReviews: 0, pendingApproval: 0, escalated: 0 };
  const systemHealth = stats?.systemHealth ?? {
    escalationRate: 0,
    overrideFrequency: 0,
    avgConfidenceScore: 0,
    alertTriggered: false,
    alertMessage: null,
  };

  const autoHandledPercent = overview.totalReviews > 0
    ? Math.round((overview.autoHandled / overview.totalReviews) * 100)
    : 0;

  const needsAttention = queues.escalated + queues.pendingApproval;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your review management</p>
        </div>
        <Button
          onClick={handleFetchReviews}
          disabled={fetchingReviews}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${fetchingReviews ? 'animate-spin' : ''}`} />
          Sync Reviews
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Reviews</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{overview.totalReviews}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Auto-handled</p>
              <p className="text-2xl font-semibold text-emerald-600 mt-1">{autoHandledPercent}%</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Avg Rating</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{overview.avgRating}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
              <Star className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">AI Confidence</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{overview.avgConfidenceScore}%</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-slate-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Needs Attention</h2>
          {needsAttention > 0 ? (
            <div className="space-y-3">
              {queues.escalated > 0 && (
                <Link href="/dashboard/queue" className="block">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100/50 rounded-xl hover:from-red-100 hover:to-red-100 transition-all border border-red-100">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center shadow-sm">
                        <AlertTriangle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{queues.escalated} Escalated Reviews</p>
                        <p className="text-sm text-slate-500">Requires human review</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </Link>
              )}

              {queues.pendingApproval > 0 && (
                <Link href="/dashboard/queue" className="block">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl hover:from-amber-100 hover:to-amber-100 transition-all border border-amber-100">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{queues.pendingApproval} Pending Approval</p>
                        <p className="text-sm text-slate-500">Awaiting your decision</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
              <p className="font-medium text-slate-800">All caught up!</p>
              <p className="text-sm text-slate-500 mt-1">No reviews need your attention</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/dashboard/reviews" className="block">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-sm">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-sm">Browse Reviews</p>
                  <p className="text-xs text-slate-500">View all reviews</p>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/queue" className="block">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-sm">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-sm">Review Queue</p>
                  <p className="text-xs text-slate-500">Process pending items</p>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/invites" className="block">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-sm">
                  <Send className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-sm">Send Invites</p>
                  <p className="text-xs text-slate-500">Request new reviews</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Performance Summary and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Sentiment Distribution</h2>
            <PieChartIcon className="h-4 w-4 text-slate-400" />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.charts?.sentimentDistribution ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {(stats?.charts?.sentimentDistribution ?? []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === 'Positive' ? '#10b981' :
                          entry.name === 'Negative' ? '#ef4444' :
                            '#f59e0b'
                      }
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Word Cloud (Styled as Tag Cloud) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-800">Topic Word Cloud</h2>
            <Tag className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 mb-6">Click any topic to filter reviews (coming soon)</p>

          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {(stats?.charts?.topTopics ?? []).length > 0 ? (
                stats?.charts?.topTopics.map((topic, i) => (
                  <motion.div
                    key={topic.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`
                      px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer hover:shadow-md
                      ${i === 0 ? 'bg-blue-50 text-blue-600 scale-110' :
                        i === 1 ? 'bg-emerald-50 text-emerald-600' :
                          i === 2 ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-50 text-slate-600'}
                    `}
                    style={{
                      fontSize: `${Math.max(0.8, Math.min(1.2, 0.8 + (topic.count / 5) * 0.1))}rem`
                    }}
                  >
                    {topic.name}
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center w-full py-12 text-slate-400">
                  <Tag className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm italic">Analyze more reviews to see topics</p>
                </div>
              )}
            </AnimatePresence>
          </div>
          <p className="text-[10px] text-slate-400 mt-8 text-center italic">Click any topic to view related reviews</p>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-5 text-center">Efficiency Summary</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-500 mb-2">Automation Rate</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                  style={{ width: `${autoHandledPercent}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-700 w-12 text-right">{autoHandledPercent}%</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-500 mb-2">Published</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full"
                  style={{ width: `${overview.totalReviews > 0 ? (overview.responded / overview.totalReviews) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-700 w-12 text-right">{overview.responded}</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-500 mb-2">Escalation Rate</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${(systemHealth.escalationRate ?? 0) > 20 ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-slate-300 to-slate-400'}`}
                  style={{ width: `${Math.min(systemHealth.escalationRate ?? 0, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-700 w-12 text-right">{(systemHealth.escalationRate ?? 0).toFixed(1)}%</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-500 mb-2">Override Rate</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-slate-300 to-slate-400 rounded-full"
                  style={{ width: `${Math.min(systemHealth.overrideFrequency ?? 0, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-700 w-12 text-right">{(systemHealth.overrideFrequency ?? 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
