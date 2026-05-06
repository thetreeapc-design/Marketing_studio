import { Toaster } from 'sonner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[#2D6A4F]" />
        <span className="font-bold text-[#2D6A4F] text-lg">열매나무 마케팅</span>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">{children}</main>
      <Toaster richColors position="top-center" />
    </div>
  )
}
