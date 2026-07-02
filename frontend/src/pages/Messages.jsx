import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessagesContext";
import { MessageCircle, Search } from "lucide-react";
import ChatModal from "../components/ChatModal";
import { initialsOf } from "../components/ui";

export default function Messages() {
  const { currentUser, users, lookupUser } = useAuth();
  const { conversations, fetchConversations } = useMessages();
  const [chatRecipient, setChatRecipient] = useState(null);
  const [search, setSearch] = useState("");
  const [resolved, setResolved] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchConversations().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build deduped conversation list
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

  // People this user can start a new conversation with, based on role:
  //   admin     → counselors only
  //   counselor → other counselors + admins (admins listed first)
  //   student   → counselors only
  const suggestionPool = useMemo(() => {
    const role = currentUser?.role;
    const all = users || [];
    if (role === "admin") {
      return all
        .filter((u) => u.role === "counselor" && u.status !== "banned")
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    if (role === "counselor") {
      return all
        .filter((u) => u.status !== "banned" && u.id !== currentUser?.id && (u.role === "counselor" || u.role === "admin"))
        .sort((a, b) => {
          if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    }
    if (role === "student" || role === "college_rep") {
      return all
        .filter((u) => u.role === "counselor" && u.status !== "banned")
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }, [users, currentUser?.role, currentUser?.id]);

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suggestionPool.slice(0, 6);
    return suggestionPool
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.position?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [suggestionPool, search]);

  const canSuggest = suggestionPool.length > 0;
  const suggestionLabel = currentUser?.role === "counselor" ? "Counselors & Admin" : "Counselors";

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

      <div
        className="mb-4 relative"
        onMouseEnter={() => canSuggest && setShowSuggestions(true)}
        onMouseLeave={() => setShowSuggestions(false)}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500"
        />
        {canSuggest && showSuggestions && searchSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
              {suggestionLabel}
            </div>
            <ul>
              {searchSuggestions.map((u) => (
                <li key={u.id}>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition"
                    onMouseDown={(e) => { e.preventDefault(); setChatRecipient(u); setShowSuggestions(false); }}
                  >
                    <div className="w-8 h-8 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {initialsOf(u.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {u.role === "admin" ? "Admin" : u.position || "Counselor"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MessageCircle className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="font-medium">No conversations yet</p>
            <p className="text-sm mt-1">Hover over the search bar to find someone to message.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filtered.map((item) => (
              <li key={item.otherId}>
                <button
                  onClick={() => handleOpen(item)}
                  className="w-full text-left px-4 py-4 hover:bg-gray-50 transition flex items-start gap-3"
                >
                  <div className="w-12 h-12 bg-maroon-600 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0 text-sm">
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
