import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // PKCE 코드 교환 (OAuth 등)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/content`)
    }
  }

  // 초대·이메일 인증 토큰 교환
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'invite' | 'email' | 'recovery' | 'signup',
    })
    if (!error) {
      // 초대 수락 후 비밀번호 설정 페이지로
      if (type === 'invite' || type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/set-password`)
      }
      return NextResponse.redirect(`${origin}/content`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
