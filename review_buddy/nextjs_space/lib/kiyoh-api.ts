const KIYOH_BASE_URL = 'https://www.kiyoh.com';

export interface KiyohConfig {
  apiKey: string;
  locationId: string;
  tenantId?: string;
}

export async function fetchKiyohReviews(
  config: KiyohConfig,
  options?: {
    dateSince?: string;
    updatedSince?: string;
    limit?: number;
    orderBy?: 'CREATE_DATE' | 'UPDATE_DATE' | 'RATING';
    sortOrder?: 'ASC' | 'DESC';
  }
) {
  const { apiKey, locationId, tenantId = '98' } = config ?? {};
  
  if (!apiKey || !locationId) {
    throw new Error('Kiyoh API key and location ID are required');
  }
  
  const params = new URLSearchParams();
  params.append('locationId', locationId);
  params.append('tenantId', tenantId);
  
  if (options?.dateSince) params.append('dateSince', options.dateSince);
  if (options?.updatedSince) params.append('updatedSince', options.updatedSince);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.orderBy) params.append('orderBy', options.orderBy);
  if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
  
  const response = await fetch(
    `${KIYOH_BASE_URL}/v1/publication/review/external?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'X-Publication-Api-Token': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response?.ok) {
    const errorData = await response?.json?.()?.catch?.(() => ({})) ?? {};
    throw new Error(
      errorData?.detailedError?.[0]?.message ?? 
      errorData?.errorCode ?? 
      `Kiyoh API error: ${response?.status}`
    );
  }
  
  return response?.json?.();
}

export async function postKiyohResponse(
  config: KiyohConfig,
  reviewId: string,
  response: string,
  responseType: 'PUBLIC' | 'PRIVATE' = 'PUBLIC',
  sendEmail: boolean = false
) {
  const { apiKey, locationId, tenantId = '98' } = config ?? {};
  
  if (!apiKey || !locationId || !reviewId || !response) {
    throw new Error('Missing required parameters for posting response');
  }
  
  const apiResponse = await fetch(
    `${KIYOH_BASE_URL}/v1/publication/review/response`,
    {
      method: 'PUT',
      headers: {
        'X-Publication-Api-Token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId,
        tenantId,
        reviewId,
        response,
        reviewResponseType: responseType,
        responseEmail: sendEmail.toString(),
      }),
    }
  );
  
  if (!apiResponse?.ok) {
    const errorData = await apiResponse?.json?.()?.catch?.(() => ({})) ?? {};
    throw new Error(
      errorData?.detailedError?.[0]?.message ?? 
      errorData?.errorCode ?? 
      `Kiyoh API error: ${apiResponse?.status}`
    );
  }
  
  return apiResponse?.json?.()?.catch?.(() => ({ success: true }));
}

export async function sendKiyohInvite(
  config: KiyohConfig,
  invite: {
    email: string;
    firstName?: string;
    lastName?: string;
    delay?: number;
    language?: string;
    refCode?: string;
  }
) {
  const { apiKey, locationId } = config ?? {};
  
  if (!apiKey || !locationId || !invite?.email) {
    throw new Error('Missing required parameters for sending invite');
  }
  
  const response = await fetch(
    `${KIYOH_BASE_URL}/v1/invite/external`,
    {
      method: 'POST',
      headers: {
        'X-Publication-Api-Token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location_id: locationId,
        invite_email: invite.email,
        delay: invite.delay ?? 0,
        first_name: invite.firstName ?? '',
        last_name: invite.lastName ?? '',
        ref_code: invite.refCode ?? '',
        language: invite.language ?? 'en',
      }),
    }
  );
  
  if (!response?.ok) {
    const errorData = await response?.json?.()?.catch?.(() => ({})) ?? {};
    throw new Error(
      errorData?.detailedError?.[0]?.message ?? 
      errorData?.errorCode ?? 
      `Kiyoh API error: ${response?.status}`
    );
  }
  
  return response?.json?.()?.catch?.(() => ({ success: true }));
}

export async function fetchKiyohLocationStats(config: KiyohConfig) {
  const { apiKey, locationId } = config ?? {};
  
  if (!apiKey || !locationId) {
    throw new Error('Kiyoh API key and location ID are required');
  }
  
  const response = await fetch(
    `${KIYOH_BASE_URL}/v1/publication/review/external/location/statistics?locationId=${locationId}`,
    {
      method: 'GET',
      headers: {
        'X-Publication-Api-Token': apiKey,
      },
    }
  );
  
  if (!response?.ok) {
    const errorData = await response?.json?.()?.catch?.(() => ({})) ?? {};
    throw new Error(
      errorData?.detailedError?.[0]?.message ?? 
      errorData?.errorCode ?? 
      `Kiyoh API error: ${response?.status}`
    );
  }
  
  return response?.json?.();
}
