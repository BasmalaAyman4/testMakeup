import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { i18n } from "@/lib/i18n/config";

const SUPPORTED_LOCALES = i18n.locales;
const DEFAULT_LOCALE = i18n.defaultLocale;
const LOCALE_REGEX = /^\/([a-z]{2})(\/|$)/;

const PROTECTED_ROUTES = ['/profile', '/orders', '/wishlist', '/cart', '/checkout'];
const AUTH_ROUTES = ['/signin', '/signup'];

/**
 * HTTPS Enforcement - DISABLED (handled by Nginx)
 * This prevents redirect loops when Nginx is not properly configured
 */
function enforceHTTPS(request) {
    // HTTPS enforcement is now handled by Nginx/reverse proxy
    // This prevents ERR_TOO_MANY_REDIRECTS
    return null;
}

/**
 * Add Security Headers
 */
function addSecurityHeaders(response) {
    // HTTPS Strict Transport Security
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload'
    );

    // Security Headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Content Security Policy
    response.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; " +
        "connect-src 'self' https://api.lajolie-eg.com https://cdn.jsdelivr.net; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
        "script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        "worker-src 'self' blob:; " +
        "child-src 'self' blob:; " +
        "media-src 'self' blob: mediastream:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "object-src 'none'; " +
        "img-src 'self' data: blob: https:; " +
        "upgrade-insecure-requests;"
    );

    return response;
}

/**
 * Check if path is a protected route
 */
function isProtectedRoute(pathname, locale) {
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    return PROTECTED_ROUTES.some(route =>
        pathWithoutLocale === route || pathWithoutLocale.startsWith(route + '/')
    );
}

/**
 * Check if path is an auth route
 */
function isAuthRoute(pathname, locale) {
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    return AUTH_ROUTES.some(route =>
        pathWithoutLocale === route || pathWithoutLocale.startsWith(route + '/')
    );
}

export async function middleware(req) {
    // HTTPS Enforcement (currently handled by Nginx)
    const httpsRedirect = enforceHTTPS(req);
    if (httpsRedirect) {
        return httpsRedirect;
    }

    const { pathname, search } = req.nextUrl;

    // Skip system paths
    if (
        pathname.startsWith("/api") ||
        pathname.startsWith("/_next") ||
        pathname.match(/\.(.*)$/)
    ) {
        return NextResponse.next();
    }

    // Extract locale from pathname
    const match = pathname.match(LOCALE_REGEX);
    const locale = match?.[1];

    // Handle missing or invalid locale
    if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
        const url = req.nextUrl.clone();
        
        // Handle root path (/)
        if (pathname === '/') {
            url.pathname = `/${DEFAULT_LOCALE}`;
        } else {
            // Handle paths without locale or invalid locale
            url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
        }
        
        // Preserve query parameters
        url.search = search;
        
        return addSecurityHeaders(NextResponse.redirect(url));
    }

    // Session check
    const session = await auth();
    const isAuthenticated = !!session?.user;

    // Protected routes - redirect to signin
    if (isProtectedRoute(pathname, locale) && !isAuthenticated) {
        const url = req.nextUrl.clone();
        url.pathname = `/${locale}/signin`;
        url.searchParams.set('callbackUrl', pathname);
        return addSecurityHeaders(NextResponse.redirect(url));
    }

    // Auth routes - redirect authenticated users to home
    if (isAuthRoute(pathname, locale) && isAuthenticated) {
        const url = req.nextUrl.clone();
        url.pathname = `/${locale}`;
        return addSecurityHeaders(NextResponse.redirect(url));
    }

    // Allow request with security headers
    return addSecurityHeaders(NextResponse.next());
}

export const config = {
    matcher: [
        "/((?!_next|api|.*\\..*).*)",
    ],
};
