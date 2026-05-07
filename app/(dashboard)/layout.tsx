import { Toaster } from 'sonner'
import BottomNav from '@/components/BottomNav'
import LogoutButton from '@/components/LogoutButton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs">🌳</div>
          <span className="font-bold text-[#2D6A4F] text-lg">열매나무 마케팅</span>
        </div>
        <LogoutButton />
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">{children}</main>
      <BottomNav />
      <Toaster richColors position="top-center" />
    </div>
  )
}
