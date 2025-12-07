'use client'
import UserNavbar from '../../components/UserNavbar'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full selection:bg-blue-500 selection:text-white">
      
      {/* Fixed Background Layer: Gradient + Tech Grid Pattern */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <UserNavbar />
      
      {/* Main Content */}
      <main className="w-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}