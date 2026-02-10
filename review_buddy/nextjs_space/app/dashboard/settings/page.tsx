'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Key,
  Building,
  MessageCircle,
  Zap,
  Shield,
  Globe,
  Facebook,
  Star,
  AlertCircle,
  CheckCircle2,
  Hash,
  Bell,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BrandConfig {
  id?: string;
  companyName: string;
  brandTone: string;
  automationLevel: string;
  escalationThresholds?: string;
  kiyohApiKey?: string;
  kiyohLocationId?: string;
  kiyohTenantId: string;
  googleApiKey?: string;
  googlePlaceId?: string;
  facebookApiKey?: string;
  facebookPageId?: string;
  trustpilotApiKey?: string;
  trustpilotBusinessId?: string;
  geminiApiKey?: string;
  slackWebhookUrl?: string;
  slackChannelName?: string;
  slackEnabled?: boolean;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<BrandConfig>({
    companyName: '',
    brandTone: 'Professional',
    automationLevel: 'SEMI_AUTO',
    kiyohTenantId: '98',
    slackEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  
  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response?.ok) {
        const data = await response?.json?.() ?? {};
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchConfig?.();
  }, [fetchConfig]);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (response?.ok) {
        toast?.success?.('Settings saved successfully');
        fetchConfig?.();
      } else {
        toast?.error?.('Failed to save settings');
      }
    } catch (error) {
      console.error('Error:', error);
      toast?.error?.('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/reviews/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1 }),
      });
      
      const data = await response?.json?.() ?? {};
      
      if (response?.ok) {
        toast?.success?.(`Connection successful! Location: ${data?.locationName ?? 'Unknown'}`);
      } else {
        toast?.error?.(data?.error ?? 'Connection failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast?.error?.('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleTestSlack = async () => {
    setTestingSlack(true);
    try {
      const response = await fetch('/api/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customMessage: {
            reviewerName: 'Test User',
            rating: 8,
            reviewText: 'This is a test message from ReviewBuddy to verify your Slack integration is working correctly.',
            riskLevel: 'Low',
            confidenceScore: 95,
            reason: 'This is a test notification',
            actionRequired: 'No action required - just confirming Slack works!',
          },
        }),
      });
      
      if (response?.ok) {
        toast?.success?.('Test message sent to Slack!');
      } else {
        const data = await response?.json?.() ?? {};
        toast?.error?.(data?.error ?? 'Failed to send test message');
      }
    } catch (error) {
      console.error('Error:', error);
      toast?.error?.('Failed to test Slack connection');
    } finally {
      setTestingSlack(false);
    }
  };
  
  const updateConfig = (key: keyof BrandConfig, value: string | boolean) => {
    setConfig(prev => ({ ...(prev ?? {}), [key]: value }));
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure your review management system</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
      
      <Tabs defaultValue="brand" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="kiyoh">Kiyoh</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="slack">Slack</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
        </TabsList>
        
        {/* Brand Configuration */}
        <TabsContent value="brand" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-emerald-600" />
                Brand Configuration
              </CardTitle>
              <CardDescription>
                Configure your brand identity and response tone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={config?.companyName ?? ''}
                  onChange={(e) => updateConfig?.('companyName', e?.target?.value ?? '')}
                  placeholder="Your Company Name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brandTone">Brand Tone</Label>
                <Select
                  value={config?.brandTone ?? 'Professional'}
                  onValueChange={(v) => updateConfig?.('brandTone', v)}
                >
                  <SelectTrigger>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Professional">Professional - Formal, businesslike</SelectItem>
                    <SelectItem value="Empathetic">Empathetic - Warm, understanding</SelectItem>
                    <SelectItem value="Friendly">Friendly - Casual, approachable</SelectItem>
                    <SelectItem value="Neutral">Neutral - Balanced, factual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="automationLevel">Automation Level</Label>
                <Select
                  value={config?.automationLevel ?? 'SEMI_AUTO'}
                  onValueChange={(v) => updateConfig?.('automationLevel', v)}
                >
                  <SelectTrigger>
                    <Zap className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">AUTO - Low-risk reviews handled automatically</SelectItem>
                    <SelectItem value="SEMI_AUTO">SEMI_AUTO - AI assists, humans approve</SelectItem>
                    <SelectItem value="MANUAL">MANUAL - All reviews require human approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Kiyoh Configuration */}
        <TabsContent value="kiyoh" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-emerald-600" />
                    Kiyoh API Configuration
                  </CardTitle>
                  <CardDescription>
                    Connect to your Kiyoh account for review management
                  </CardDescription>
                </div>
                <Badge variant={config?.kiyohApiKey ? 'success' : 'secondary'}>
                  {config?.kiyohApiKey ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="kiyohApiKey">API Key (Publication Token)</Label>
                <Input
                  id="kiyohApiKey"
                  type="password"
                  value={config?.kiyohApiKey ?? ''}
                  onChange={(e) => updateConfig?.('kiyohApiKey', e?.target?.value ?? '')}
                  placeholder="Enter your Kiyoh X-Publication-Api-Token"
                />
                <p className="text-xs text-gray-500">
                  Found in your Kiyoh dashboard under Invite → Extra options
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kiyohLocationId">Location ID</Label>
                  <Input
                    id="kiyohLocationId"
                    value={config?.kiyohLocationId ?? ''}
                    onChange={(e) => updateConfig?.('kiyohLocationId', e?.target?.value ?? '')}
                    placeholder="e.g., 1234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kiyohTenantId">Tenant ID</Label>
                  <Select
                    value={config?.kiyohTenantId ?? '98'}
                    onValueChange={(v) => updateConfig?.('kiyohTenantId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="98">Kiyoh (98)</SelectItem>
                      <SelectItem value="99">Klantenvertellen (99)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || !config?.kiyohApiKey || !config?.kiyohLocationId}
              >
                {testing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* AI Settings */}
        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                AI Configuration
              </CardTitle>
              <CardDescription>
                AI-powered risk assessment and response generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-800">AI Service Active</span>
                </div>
                <p className="text-sm text-emerald-700 mt-1">
                  Using Gemini 2.5 Flash for risk assessment and response generation.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Active Features</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Content Risk Analysis',
                    'Reputational Risk Analysis',
                    'Contextual Risk Analysis',
                    'PII Detection',
                    'Legal Risk Detection',
                    'Brand Tone Matching',
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slack Integration */}
        <TabsContent value="slack" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-emerald-600" />
                    Slack Integration
                  </CardTitle>
                  <CardDescription>
                    Get notified when ReviewBuddy needs your input on complex cases
                  </CardDescription>
                </div>
                <Badge variant={config?.slackEnabled ? 'success' : 'secondary'}>
                  {config?.slackEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">When will ReviewBuddy notify you?</p>
                    <ul className="text-sm text-amber-700 mt-1 space-y-1">
                      <li>• High-risk reviews that need escalation</li>
                      <li>• Reviews with potential legal implications</li>
                      <li>• Cases where AI confidence is low</li>
                      <li>• Reviews containing PII that need handling</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slackEnabled">Enable Slack Notifications</Label>
                <Select
                  value={config?.slackEnabled ? 'true' : 'false'}
                  onValueChange={(v) => updateConfig?.('slackEnabled', v === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slackWebhookUrl">Webhook URL</Label>
                <Input
                  id="slackWebhookUrl"
                  type="password"
                  value={config?.slackWebhookUrl ?? ''}
                  onChange={(e) => updateConfig?.('slackWebhookUrl', e?.target?.value ?? '')}
                  placeholder="https://hooks.slack.com/services/..."
                />
                <p className="text-xs text-gray-500">
                  Create an incoming webhook in your Slack workspace at api.slack.com/apps
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slackChannelName">Channel Name (optional)</Label>
                <Input
                  id="slackChannelName"
                  value={config?.slackChannelName ?? ''}
                  onChange={(e) => updateConfig?.('slackChannelName', e?.target?.value ?? '')}
                  placeholder="#reviews"
                />
              </div>
              
              <Button
                variant="outline"
                onClick={handleTestSlack}
                disabled={testingSlack || !config?.slackWebhookUrl || !config?.slackEnabled}
              >
                {testingSlack ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test Message
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Other Platforms */}
        <TabsContent value="platforms" className="mt-4">
          <div className="space-y-4">
            <Card className="opacity-60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-gray-400" />
                    Google Business Reviews
                  </CardTitle>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
                <CardDescription>Connect to Google Business Profile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-gray-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Available in a future update</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="opacity-60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Facebook className="h-5 w-5 text-gray-400" />
                    Facebook Reviews
                  </CardTitle>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
                <CardDescription>Connect to your Facebook Page</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-gray-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Available in a future update</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="opacity-60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-gray-400" />
                    Trustpilot
                  </CardTitle>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
                <CardDescription>Connect to Trustpilot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-gray-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Available in a future update</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
