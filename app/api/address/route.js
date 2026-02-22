// app/api/address/route.js
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { API_CONFIG } from '@/utils/constants';
import { getApiLangCode } from '@/utils/locale';

/**
 * GET /api/address - Get user addresses
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

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/UserAddress`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data?.message || 'Failed to fetch addresses'
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Address GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/address - Add new address
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
    const locale = request.headers.get('x-locale') || 'ar';
    const langCode = getApiLangCode(locale);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.accessToken}`,
      'langCode': langCode,
      'Accept-Language': locale === 'ar' ? 'ar-EG' : 'en-US',
      'X-Client-Type': 'Web'
    };

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/UserAddress`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.log('Non-JSON response:', text);
      data = text === 'true' || text === 'True' ? {} : { message: text };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data?.title || data?.message || 'Failed to add address'
        },
        { status: response.status }
      );
    }

    // Log the response to debug
    console.log('Address added successfully. Response data:', data);
    console.log('Response type:', typeof data);

    // Handle case where backend returns just 'true'
    if (data === true || data === 'true' || (typeof data === 'object' && Object.keys(data).length === 0)) {
      console.warn('Backend returned boolean/empty object instead of address data. Fetching addresses...');
      
      // Fetch the addresses list to get the newly added address
      try {
        const addressesResponse = await fetch(`${API_CONFIG.BASE_URL}/api/UserAddress`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'langCode': langCode,
            'Accept-Language': locale === 'ar' ? 'ar-EG' : 'en-US',
            'X-Client-Type': 'Web'
          }
        });

        if (addressesResponse.ok) {
          const addressesData = await addressesResponse.json();
          console.log('Fetched addresses:', addressesData);
          
          // Get the most recently added address (usually the last one or the one marked as default if user checked it)
          if (Array.isArray(addressesData) && addressesData.length > 0) {
            const newAddress = addressesData[addressesData.length - 1];
            
            return NextResponse.json({
              success: true,
              data: newAddress,
              message: locale === 'ar' ? 'تم إضافة العنوان بنجاح' : 'Address added successfully'
            });
          }
        }
      } catch (fetchError) {
        console.error('Error fetching addresses:', fetchError);
      }
      
      // Fallback: return success but trigger a full page refresh
      return NextResponse.json({
        success: true,
        data: { id: Date.now(), requiresRefresh: true }, // Temporary ID to prevent errors
        message: locale === 'ar' ? 'تم إضافة العنوان بنجاح' : 'Address added successfully',
        requiresRefresh: true
      });
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: locale === 'ar' ? 'تم إضافة العنوان بنجاح' : 'Address added successfully'
    });

  } catch (error) {
    console.error('Address POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
