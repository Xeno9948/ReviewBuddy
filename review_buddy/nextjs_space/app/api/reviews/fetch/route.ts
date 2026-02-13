export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { fetchKiyohReviews } from '@/lib/kiyoh-api';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const brandConfig = await prisma.brandConfig.findFirst({
      where: { isActive: true },
    });

    if (!brandConfig?.kiyohApiKey || !brandConfig?.kiyohLocationId) {
      return NextResponse.json(
        { error: 'Kiyoh API credentials not configured' },
        { status: 400 }
      );
    }

    const body = await request?.json?.()?.catch?.(() => ({})) ?? {};
    const { dateSince, limit = 50 } = body ?? {};

    const kiyohData = await fetchKiyohReviews(
      {
        apiKey: brandConfig.kiyohApiKey,
        locationId: brandConfig.kiyohLocationId,
        tenantId: brandConfig.kiyohTenantId ?? '98',
      },
      {
        dateSince,
        limit,
        orderBy: 'CREATE_DATE',
        sortOrder: 'DESC',
      }
    );

    const reviews = kiyohData?.reviews ?? [];
    const importedCount = { new: 0, updated: 0 };
    const newReviewIds: string[] = [];

    for (const review of reviews) {
      const reviewId = review?.reviewId;
      if (!reviewId) continue;

      // Extract review text from reviewContent
      let reviewText = '';
      let oneLiner = '';
      const reviewContent = review?.reviewContent ?? [];

      for (const content of reviewContent) {
        if (content?.questionGroup === 'DEFAULT_OPINION') {
          reviewText = String(content?.rating ?? '');
        }
        if (content?.questionGroup === 'DEFAULT_ONELINER') {
          oneLiner = String(content?.rating ?? '');
        }
      }

      const existingReview = await prisma.review.findUnique({
        where: { externalId: reviewId },
      });

      if (existingReview) {
        await prisma.review.update({
          where: { id: existingReview.id },
          data: {
            rating: review?.rating ?? 0,
            reviewText: reviewText || oneLiner || 'No review text',
            oneLiner: oneLiner || null,
            updatedAt: new Date(),
          },
        });
        importedCount.updated++;
      } else {
        const newReview = await prisma.review.create({
          data: {
            externalId: reviewId,
            platform: 'kiyoh',
            reviewText: reviewText || oneLiner || 'No review text',
            oneLiner: oneLiner || null,
            rating: review?.rating ?? 0,
            reviewerName: review?.reviewAuthor ?? 'Anonymous',
            reviewerCity: review?.city ?? null,
            reviewTimestamp: new Date(review?.dateSince ?? Date.now()),
            status: 'new',
          },
        });
        importedCount.new++;
        newReviewIds.push(newReview.id);
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actionType: 'REVIEWS_FETCHED',
        metadata: JSON.stringify({
          source: 'kiyoh',
          totalFetched: reviews?.length ?? 0,
          newReviews: importedCount.new,
          updatedReviews: importedCount.updated,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      fetched: reviews?.length ?? 0,
      imported: importedCount,
      newReviewIds: newReviewIds,
      locationName: kiyohData?.locationName ?? '',
      averageRating: kiyohData?.averageRating ?? 0,
      totalReviews: kiyohData?.numberReviews ?? 0,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
