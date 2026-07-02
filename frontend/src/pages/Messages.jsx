import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessagesContext";
import { MessageCircle, Search } from "lucide-react";
import ChatModal from "../components/ChatModal";

const ROLE_LABELS = {
  student: "Student",
  counselor: "Counselor",
  college_rep: "College",
  admin: "Admin",
};

export default function Messages() {
  const { currentUser, lookupUser } = useAuth();
  const { conversations, fetchConversations, getUnreadCount } = useMessages();
  const [chatRecipient, setChatRecipient] = useState(null);
  const [search, setSearch] = useState("");
  const [resolved, setResolved] = useState({});

  useEffect(() => {
    fetchConversations().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each conversation row is the LATEST message between currentUser and other.
  // Build a deduped list of "other users" with the latest message preview.
  const items = useMemo(() => {
    const byOther = new Map();
    for (const m of conversations) {
      const otherId = m.senderId === currentUser?.id ? m.recipientId : m.senderId;
      const otherName = m.senderId === currentUser?.id ? m.recipientName : m.senderName;
      const existing = byOther.get(otherId);
      if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
        byOther.set(otherId, {
          otherId,
          otherName,
          content: m.content,
          timestamp: m.timestamp,
          unread: m.senderId !== currentUser?.id && !m.read,
        });
      }
    }
    return Array.from(byOther.values()).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [conversations, currentUser?.id]);

  const filtered = items.filter(it =>
    !search.trim() || it.otherName?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleOpen = async (item) => {
    let user = resolved[item.otherId];
    if (!user) {
      user = await lookupUser?.(item.otherId);
      if (user) setResolved(prev => ({ ...prev, [item.otherId]: user }));
    }
    setChatRecipient(user || { id: item.otherId, name: item.otherName });
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="text-maroon-600" size={28} />
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Messages</h2>
          <p className="text-sm text-gray-600">All your conversations in one place.</p>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 shadow overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MessageCircle className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="font-medium">No conversations yet</p>
            <p className="text-sm mt-1">Start a conversation from an appointment or profile.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filtered.map((item) => (
              <li key={item.otherId}>
                <button
                  onClick={() => handleOpen(item)}
                  className="w-full text-left px-4 py-4 hover:bg-gray-50 transition flex items-start gap-3"
                >
                  <div className="w-12 h-12 bg-maroon-600 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                    {item.otherName?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-medium truncate ${item.unread ? "text-gray-900" : "text-gray-800"}`}>
                        {item.otherName || "Unknown"}
                      </p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatTime(item.timestamp)}</span>
                    </div>
                    <p className={`text-sm truncate ${item.unread ? "font-medium text-gray-900" : "text-gray-600"}`}>
                      {item.content}
                    </p>
                  </div>
                  {item.unread && (
                    <span className="w-2.5 h-2.5 bg-maroon-600 rounded-full flex-shrink-0 mt-2" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {chatRecipient && (
        <ChatModal
          recipientUser={chatRecipient}
          onClose={() => {
            setChatRecipient(null);
            fetchConversations().catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}
