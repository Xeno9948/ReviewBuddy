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
    const status = searchParams?.get('status');
    const decision = searchParams?.get('decision');
    const platform = searchParams?.get('platform');
    const page = parseInt(searchParams?.get('page') ?? '1');
    const limit = parseInt(searchParams?.get('limit') ?? '20');
    
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (decision) where.decision = decision;
    if (platform) where.platform = platform;
    
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          humanAssigned: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);
    
    return NextResponse.json({
      reviews: reviews ?? [],
      total: total ?? 0,
      page,
      totalPages: Math.ceil((total ?? 0) / limit),
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
