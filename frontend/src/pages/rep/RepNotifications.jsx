import React from "react";
import { useNotifications } from "../../context/NotificationsContext";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function RepNotifications() {
  const { getNotificationsForCurrentUser, markAsRead, markAllAsRead, getUnreadCount } = useNotifications();
  const notifications = getNotificationsForCurrentUser();
  const unreadCount = getUnreadCount();

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return 'border-l-green-500 bg-green-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      case 'error': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Notifications</h2>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="px-4 py-2 bg-maroon-500 text-white rounded-lg hover:bg-maroon-600 transition">
            Mark All as Read
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No notifications yet.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 border-b last:border-b-0 border-l-4 ${!notif.read ? getTypeColor(notif.type) : 'border-l-gray-300 hover:bg-gray-50'} cursor-pointer transition`}
              onClick={() => markAsRead(notif.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{notif.title}</p>
                    {!notif.read && (
                      <span className="px-2 py-0.5 bg-maroon-500 text-white text-xs rounded-full">New</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{formatDate(notif.createdAt)}</p>
                  {notif.link && (
                    <Link to={notif.link} className="text-sm text-maroon-600 hover:underline mt-2 inline-block">
                      View Details →
                    </Link>
                  )}
                </div>
                {notif.read && (
                  <CheckCircle2 size={18} className="text-gray-400 mt-1" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}