'use client'
import UserNavbar from '../../components/UserNavbar'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <UserNavbar />
      {/* FULL WIDTH CONTAINER: 
          Using 'w-full' allows content to expand to the edges of the screen.
          Retained padding (px-4/6/8) so content doesn't touch the absolute edge.
      */}
      <main className="w-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}