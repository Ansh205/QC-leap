'use client'

import { useEffect, useState, useRef } from 'react'
import { notifications as notificationsAPI, invitations, auth, type Notification } from '@/lib/api'
import { Bell, BellDot } from 'lucide-react'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const [notifList, count] = await Promise.all([
        notificationsAPI.list(false, 20),
        notificationsAPI.getUnreadCount(),
      ])
      setNotifications(notifList)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsAPI.markAsRead(notificationId)
      await fetchNotifications()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      await fetchNotifications()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleAcceptInvitation = async (invitationId: number, notificationId: number) => {
    setLoading(true)
    try {
      await invitations.accept(invitationId)
      await notificationsAPI.markAsRead(notificationId)
      // Refresh user data
      const user = await auth.getCurrentUser()
      // Refresh notifications
      await fetchNotifications()
      // Show success message
      alert(
        `Welcome! You are now a member of ${user.company?.name || 'the company'}.\n\nYou can now access:\n• ${user.permission === 'INSPECT_AND_TRAIN' ? 'Inspection & Training features' : 'Inspection features'}\n• Company resources and models\n• Collaborative workspace`
      )
    } catch (error: any) {
      alert(error.message || 'Failed to accept invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleDeclineInvitation = async (invitationId: number, notificationId: number) => {
    setLoading(true)
    try {
      await invitations.decline(invitationId)
      await notificationsAPI.markAsRead(notificationId)
      await fetchNotifications()
    } catch (error: any) {
      alert(error.message || 'Failed to decline invitation')
    } finally {
      setLoading(false)
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return `${Math.floor(seconds / 604800)}w ago`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 transition-colors hover:bg-gray-100"
      >
        <Bell className="h-6 w-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 flex max-h-[36rem] w-96 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 py-3.5">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-gray-100 px-4 py-3.5 transition-all hover:bg-gray-50 ${
                    !notification.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
                  }`}
                >
                  <div className="mb-1.5 flex items-start justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
                    <span className="ml-2 text-xs font-medium whitespace-nowrap text-gray-500">
                      {getTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">{notification.message}</p>

                  {/* Invitation Actions */}
                  {notification.type === 'invitation' &&
                    notification.related_id &&
                    !notification.is_read && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() =>
                            handleAcceptInvitation(notification.related_id!, notification.id)
                          }
                          disabled={loading}
                          className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() =>
                            handleDeclineInvitation(notification.related_id!, notification.id)
                          }
                          disabled={loading}
                          className="flex-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                  {/* Mark as Read */}
                  {!notification.is_read && notification.type !== 'invitation' && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
