import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 로그인 페이지 접근 시 이미 로그인 상태면 대시보드로
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/content', request.url))
  }

  // 보호된 경로에 미인증 접근 시 로그인으로
  // /auth/ 경로는 인증 처리 중이므로 통과
  if (pathname.startsWith('/auth/')) return response

  const protectedPaths = ['/content', '/persona', '/calendar', '/analytics', '/inquiries']
  if (protectedPaths.some(p => pathname.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)',
  ],
}
