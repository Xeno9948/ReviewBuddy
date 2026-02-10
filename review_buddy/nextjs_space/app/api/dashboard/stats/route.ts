export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get review counts by decision
    const [totalReviews, autoHandled, holdForApproval, escalated, responded] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { decision: 'AUTO_HANDLE' } }),
      prisma.review.count({ where: { decision: 'HOLD_FOR_APPROVAL' } }),
      prisma.review.count({ where: { decision: 'ESCALATE_TO_HUMAN' } }),
      prisma.review.count({ where: { status: 'responded' } }),
    ]);
    
    // Get reviews by status
    const [newReviews, pendingApproval, escalatedReviews] = await Promise.all([
      prisma.review.count({ where: { status: 'new' } }),
      prisma.review.count({ where: { status: 'pending_approval' } }),
      prisma.review.count({ where: { status: 'escalated' } }),
    ]);
    
    // Get average confidence score
    const avgConfidence = await prisma.review.aggregate({
      _avg: { confidenceScore: true },
      where: { confidenceScore: { gt: 0 } },
    });
    
    // Get average rating
    const avgRating = await prisma.review.aggregate({
      _avg: { rating: true },
    });
    
    // Get latest system health
    const systemHealth = await prisma.systemHealth.findFirst({
      orderBy: { timestamp: 'desc' },
    });
    
    // Get recent reviews for chart
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const recentReviews = await prisma.review.groupBy({
      by: ['decision'],
      _count: { id: true },
      where: { createdAt: { gte: last7Days } },
    });
    
    // Get rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      _count: { id: true },
      orderBy: { rating: 'asc' },
    });
    
    return NextResponse.json({
      overview: {
        totalReviews: totalReviews ?? 0,
        autoHandled: autoHandled ?? 0,
        holdForApproval: holdForApproval ?? 0,
        escalated: escalated ?? 0,
        responded: responded ?? 0,
        avgConfidenceScore: Math.round(avgConfidence?._avg?.confidenceScore ?? 0),
        avgRating: (avgRating?._avg?.rating ?? 0).toFixed(1),
      },
      queues: {
        newReviews: newReviews ?? 0,
        pendingApproval: pendingApproval ?? 0,
        escalated: escalatedReviews ?? 0,
      },
      systemHealth: {
        escalationRate: systemHealth?.escalationRate ?? 0,
        overrideFrequency: systemHealth?.overrideFrequency ?? 0,
        avgConfidenceScore: systemHealth?.avgConfidenceScore ?? 0,
        alertTriggered: systemHealth?.alertTriggered ?? false,
        alertMessage: systemHealth?.alertMessage ?? null,
      },
      charts: {
        decisionDistribution: (recentReviews ?? []).map((r) => ({
          name: r?.decision ?? 'Unknown',
          value: r?._count?.id ?? 0,
        })),
        ratingDistribution: (ratingDistribution ?? []).map((r) => ({
          rating: r?.rating ?? 0,
          count: r?._count?.id ?? 0,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
