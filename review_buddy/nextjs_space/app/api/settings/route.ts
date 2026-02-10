export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let brandConfig = await prisma.brandConfig.findFirst({ where: { isActive: true } });
    
    if (!brandConfig) {
      brandConfig = await prisma.brandConfig.create({
        data: {
          companyName: 'My Company',
          brandTone: 'Professional',
          automationLevel: 'SEMI_AUTO',
          isActive: true,
        },
      });
    }
    
    // Mask sensitive data
    const safeConfig = {
      id: brandConfig?.id,
      companyName: brandConfig?.companyName ?? '',
      brandTone: brandConfig?.brandTone ?? 'Professional',
      automationLevel: brandConfig?.automationLevel ?? 'SEMI_AUTO',
      escalationThresholds: brandConfig?.escalationThresholds ?? null,
      kiyohApiKey: brandConfig?.kiyohApiKey ? '••••••••' : null,
      kiyohLocationId: brandConfig?.kiyohLocationId ?? null,
      kiyohTenantId: brandConfig?.kiyohTenantId ?? '98',
      googleApiKey: brandConfig?.googleApiKey ? '••••••••' : null,
      googlePlaceId: brandConfig?.googlePlaceId ?? null,
      facebookApiKey: brandConfig?.facebookApiKey ? '••••••••' : null,
      facebookPageId: brandConfig?.facebookPageId ?? null,
      trustpilotApiKey: brandConfig?.trustpilotApiKey ? '••••••••' : null,
      trustpilotBusinessId: brandConfig?.trustpilotBusinessId ?? null,
      geminiApiKey: brandConfig?.geminiApiKey ? '••••••••' : null,
      slackWebhookUrl: brandConfig?.slackWebhookUrl ? '••••••••' : null,
      slackChannelName: brandConfig?.slackChannelName ?? null,
      slackEnabled: brandConfig?.slackEnabled ?? false,
      isActive: brandConfig?.isActive ?? true,
    };
    
    return NextResponse.json(safeConfig);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request?.json?.()?.catch?.(() => ({})) ?? {};
    
    let brandConfig = await prisma.brandConfig.findFirst({ where: { isActive: true } });
    
    const updateData: Record<string, unknown> = {};
    
    if (body?.companyName !== undefined) updateData.companyName = body.companyName;
    if (body?.brandTone !== undefined) updateData.brandTone = body.brandTone;
    if (body?.automationLevel !== undefined) updateData.automationLevel = body.automationLevel;
    if (body?.escalationThresholds !== undefined) updateData.escalationThresholds = body.escalationThresholds;
    
    // Only update API keys if new value provided (not masked)
    if (body?.kiyohApiKey && body.kiyohApiKey !== '••••••••') updateData.kiyohApiKey = body.kiyohApiKey;
    if (body?.kiyohLocationId !== undefined) updateData.kiyohLocationId = body.kiyohLocationId;
    if (body?.kiyohTenantId !== undefined) updateData.kiyohTenantId = body.kiyohTenantId;
    
    if (body?.googleApiKey && body.googleApiKey !== '••••••••') updateData.googleApiKey = body.googleApiKey;
    if (body?.googlePlaceId !== undefined) updateData.googlePlaceId = body.googlePlaceId;
    
    if (body?.facebookApiKey && body.facebookApiKey !== '••••••••') updateData.facebookApiKey = body.facebookApiKey;
    if (body?.facebookPageId !== undefined) updateData.facebookPageId = body.facebookPageId;
    
    if (body?.trustpilotApiKey && body.trustpilotApiKey !== '••••••••') updateData.trustpilotApiKey = body.trustpilotApiKey;
    if (body?.trustpilotBusinessId !== undefined) updateData.trustpilotBusinessId = body.trustpilotBusinessId;
    
    if (body?.geminiApiKey && body.geminiApiKey !== '••••••••') updateData.geminiApiKey = body.geminiApiKey;
    
    // Slack fields
    if (body?.slackWebhookUrl && body.slackWebhookUrl !== '••••••••') updateData.slackWebhookUrl = body.slackWebhookUrl;
    if (body?.slackChannelName !== undefined) updateData.slackChannelName = body.slackChannelName;
    if (body?.slackEnabled !== undefined) updateData.slackEnabled = body.slackEnabled;
    
    if (brandConfig) {
      brandConfig = await prisma.brandConfig.update({
        where: { id: brandConfig.id },
        data: updateData,
      });
    } else {
      brandConfig = await prisma.brandConfig.create({
        data: {
          companyName: (body?.companyName as string) ?? 'My Company',
          brandTone: (body?.brandTone as string) ?? 'Professional',
          automationLevel: (body?.automationLevel as string) ?? 'SEMI_AUTO',
          isActive: true,
          ...updateData,
        },
      });
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        actionType: 'SETTINGS_UPDATED',
        humanUserId: (session.user as { id?: string })?.id,
        metadata: JSON.stringify({ updatedFields: Object.keys(updateData ?? {}) }),
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
