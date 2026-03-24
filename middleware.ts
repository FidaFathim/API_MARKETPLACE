import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check the admin-session cookie
    const adminSession = request.cookies.get('admin-session');

    // Protect /admin routes
    if (request.nextUrl.pathname.startsWith('/admin') && !adminSession) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
