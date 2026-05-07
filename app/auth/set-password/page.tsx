'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다'); return }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('비밀번호 설정 실패: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/content')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#2D6A4F] mx-auto flex items-center justify-center">
            <span className="text-white text-2xl">🌳</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2D6A4F]">비밀번호 설정</h1>
          <p className="text-sm text-gray-500">앞으로 로그인에 사용할 비밀번호를 설정하세요</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-center">새 비밀번호</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="6자 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirm">비밀번호 확인</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="동일하게 입력"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white"
              >
                {loading ? '저장 중...' : '비밀번호 저장 후 시작'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
