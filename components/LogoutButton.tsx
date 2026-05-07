'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors py-1 px-2 rounded-md hover:bg-gray-100"
    >
      <LogOut size={14} />
      로그아웃
    </button>
  )
}
