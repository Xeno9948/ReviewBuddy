export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request?.url ?? '');
    const actionType = searchParams?.get('actionType');
    const reviewId = searchParams?.get('reviewId');
    const page = parseInt(searchParams?.get('page') ?? '1');
    const limit = parseInt(searchParams?.get('limit') ?? '50');
    
    const where: Record<string, unknown> = {};
    if (actionType) where.actionType = actionType;
    if (reviewId) where.reviewId = reviewId;
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          review: {
            select: { id: true, reviewText: true, reviewerName: true, platform: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    
    return NextResponse.json({
      logs: logs ?? [],
      total: total ?? 0,
      page,
      totalPages: Math.ceil((total ?? 0) / limit),
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
