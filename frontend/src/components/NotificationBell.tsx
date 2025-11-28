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
        notificationsAPI.getUnreadCount()
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
      alert(`Welcome! You are now a member of ${user.company?.name || 'the company'}.\n\nYou can now access:\n• ${user.permission === 'INSPECT_AND_TRAIN' ? 'Inspection & Training features' : 'Inspection features'}\n• Company resources and models\n• Collaborative workspace`)
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
        className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
      >
        {unreadCount > 0 ? (
          <BellDot className="h-6 w-6 text-yellow-500" />
        ) : (
          <Bell className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[36rem] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-all ${
                    !notification.is_read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className="font-semibold text-gray-900 text-sm">{notification.title}</h4>
                    <span className="text-xs text-gray-500 ml-2 whitespace-nowrap font-medium">
                      {getTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{notification.message}</p>

                  {/* Invitation Actions */}
                  {notification.type === 'invitation' && notification.related_id && !notification.is_read && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAcceptInvitation(notification.related_id!, notification.id)}
                        disabled={loading}
                        className="flex-1 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineInvitation(notification.related_id!, notification.id)}
                        disabled={loading}
                        className="flex-1 px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {/* Mark as Read */}
                  {!notification.is_read && notification.type !== 'invitation' && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium"
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
