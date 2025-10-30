'use client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, ChartColumnStacked, UserCog } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()

  function handleSignOut() {
    router.push('/')
  }
  return (
    <nav className="fixed top-0 left-0 z-50 flex h-14 w-full items-center border-b bg-white px-6">
      <div className="flex w-full items-center justify-between">
        <Link href={'/models'} className="text-2xl font-bold text-[#0088FF]">
          QC-Leap
        </Link>
        <div className="flex items-center gap-9">
          <Button variant={'ghost'} size={'icon'}>
            <Bell className="size-6" />
          </Button>
          <Link href={'/stats'}>
            <Button variant={'ghost'} size={'icon'}>
              <ChartColumnStacked className="size-6" />
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={'ghost'} size={'icon'}>
                <UserCog className="size-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
