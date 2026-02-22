// app/api/address/basic-data/route.js
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { API_CONFIG } from '@/utils/constants';
import { getApiLangCode } from '@/utils/locale';

/**
 * GET /api/address/basic-data - Get cities and areas
 */
export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'ar';
    const langCode = getApiLangCode(locale);

    const headers = {
      'Authorization': `Bearer ${session.accessToken}`,
      'langCode': langCode,
      'Accept-Language': locale === 'ar' ? 'ar-EG' : 'en-US',
      'X-Client-Type': 'Web'
    };

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/UserAddress/getBasicData`,
      {
        method: 'GET',
        headers,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch basic data'
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Basic data GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
