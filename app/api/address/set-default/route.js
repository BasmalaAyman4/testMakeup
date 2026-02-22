// app/api/address/set-default/route.js
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { API_CONFIG } from '@/utils/constants';
import { getApiLangCode } from '@/utils/locale';

/**
 * POST /api/address/set-default - Set address as default
 */
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { addressId } = body;

    if (!addressId) {
      return NextResponse.json(
        { success: false, error: 'Address ID is required' },
        { status: 400 }
      );
    }

    const locale = request.headers.get('x-locale') || 'ar';
    const langCode = getApiLangCode(locale);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.accessToken}`,
      'langCode': langCode,
      'Accept-Language': locale === 'ar' ? 'ar-EG' : 'en-US',
      'X-Client-Type': 'Web'
    };

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/UserAddress/setAsDefault/${addressId}`,
      {
        method: 'POST',
        headers,
      }
    );

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: data?.message || 'Failed to set default address'
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: locale === 'ar' ? 'تم تعيين العنوان الافتراضي' : 'Default address set successfully'
    });

  } catch (error) {
    console.error('Set default address error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
