'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
// Added Cuboid to imports
import { Building2, ChartColumnStacked, LogOut, UserCog, MessageSquare, Cuboid } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { auth } from '@/lib/api'
import NotificationBell from '@/components/NotificationBell'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const user = await auth.getCurrentUser()
        setIsCompanyAdmin(user.role?.toUpperCase() === 'COMPANY_ADMIN')
      } catch (error) {
        console.error('Failed to fetch user:', error)
      } finally {
        setLoading(false)
      }
    }
    checkUserRole()
  }, [])

  function handleSignOut() {
    auth.logout()
    router.push('/')
  }

  const NavButton = ({ href, icon: Icon, label, active }: { href: string, icon: any, label?: string, active?: boolean }) => (
    <Link href={href}>
        <Button 
            variant={active ? 'secondary' : 'ghost'} 
            size={label ? 'default' : 'icon'} 
            className={`${active ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'} transition-all`}
            title={label}
        >
            <Icon className="size-5" />
            {label && <span className="ml-2 hidden md:inline">{label}</span>}
        </Button>
    </Link>
  )

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
              <Link href={'/models'} className="flex items-center gap-2 group transition-opacity hover:opacity-80">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
                     <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
                      QC-Leap
                  </span>
              </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            {/* Added Models Button */}
            <NavButton 
              href={'/models'} 
              icon={Cuboid} 
              active={pathname === '/models' || pathname.startsWith('/models/')}
            />

            <NavButton 
              href={'/chatbot'} 
              icon={MessageSquare} 
              active={pathname === '/chatbot'}
            />
            <NavButton 
              href={'/stats'} 
              icon={ChartColumnStacked} 
              active={pathname === '/stats'}
            />
            
            {!loading && isCompanyAdmin && (
              <NavButton 
                  href={'/company'} 
                  icon={Building2} 
                  active={pathname === '/company'}
              />
            )}
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                      <UserCog className="size-5 text-slate-600" />
                   </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                    <DropdownMenuGroup>
                       <Link href="/account">
                          <DropdownMenuItem className="cursor-pointer font-medium text-slate-700">
                              <UserCog className="mr-2 h-4 w-4" /> Account Settings
                          </DropdownMenuItem>
                       </Link>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="my-2"/>
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer font-medium">
                        <LogOut className="mr-2 h-4 w-4" /> Log Out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}