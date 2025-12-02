'use client'
<<<<<<< HEAD
=======
import { useState, useEffect } from 'react'
>>>>>>> master
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
<<<<<<< HEAD
import { Bell, ChartColumnStacked, UserCog } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()

  function handleSignOut() {
    router.push('/')
  }
=======
import { Bell, Building2, ChartColumnStacked, LogOut, UserCog, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/api'
import NotificationBell from '@/components/NotificationBell'

export default function Navbar() {
  const router = useRouter()
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

>>>>>>> master
  return (
    <nav className="fixed top-0 left-0 z-50 flex h-14 w-full items-center border-b bg-white px-6">
      <div className="flex w-full items-center justify-between">
        <Link href={'/models'} className="text-2xl font-bold text-[#0064C8]">
          QC-Leap
        </Link>
        <div className="flex items-center gap-9">
<<<<<<< HEAD
          <Button variant={'ghost'} size={'icon'}>
            <Bell className="size-6" />
          </Button>
=======
          <NotificationBell />
          <Link href={'/chatbot'}>
            <Button variant={'ghost'} size={'icon'} title="AI Assistant">
              <MessageSquare className="size-6" />
            </Button>
          </Link>
>>>>>>> master
          <Link href={'/stats'}>
            <Button variant={'ghost'} size={'icon'}>
              <ChartColumnStacked className="size-6" />
            </Button>
          </Link>
<<<<<<< HEAD
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={'ghost'} size={'icon'}>
                <UserCog className="size-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <Link href={'/account'}>
                  <DropdownMenuItem>Account</DropdownMenuItem>
                </Link>

                <Link href={'/invitations'}>
                  <DropdownMenuItem>Invitations</DropdownMenuItem>
                </Link>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <span className="text-red-600">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
=======
          {!loading && isCompanyAdmin && (
            <Link href={'/company'}>
              <Button variant={'ghost'} size={'icon'} title="Company Management">
                <Building2 className="size-6" />
              </Button>
            </Link>
          )}
          <Link href={'/account'}>
            <Button variant={'ghost'} size={'icon'} title="Account Settings">
              <UserCog className="size-6" />
            </Button>
          </Link>
          <Button variant={'ghost'} size={'icon'} title="Log Out" onClick={handleSignOut}>
            <LogOut className="size-6 text-red-600" />
          </Button>
>>>>>>> master
        </div>
      </div>
    </nav>
  )
}
