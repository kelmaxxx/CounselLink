import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessagesContext";
import { MessageCircle, Search } from "lucide-react";
import ChatModal from "../components/ChatModal";
import Avatar from "../components/Avatar";
import { PageHeader, initialsOf } from "../components/ui";

const relativeTime = (iso) => {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function Messages() {
  const { currentUser, users, lookupUser, fetchUsersByRole, setUsers } = useAuth();
  const { conversations, fetchConversations } = useMessages();
  const [chatRecipient, setChatRecipient] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("inbox");
  const [resolved, setResolved] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchConversations().catch(() => undefined);
    if ((currentUser?.role === "student" || currentUser?.role === "college_rep") && fetchUsersByRole) {
      fetchUsersByRole("counselor")
        .then((counselors) => {
          if (counselors && setUsers) setUsers(counselors);
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]);

  // Build deduped conversation list
  const items = useMemo(() => {
    const byOther = new Map();
    for (const m of conversations) {
      const fromMe = m.senderId === currentUser?.id;
      const otherId = fromMe ? m.recipientId : m.senderId;
      const otherName = fromMe ? m.recipientName : m.senderName;
      const existing = byOther.get(otherId);
      if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
        byOther.set(otherId, {
          otherId,
          otherName,
          content: m.content,
          timestamp: m.timestamp,
          fromMe,
          unread: !fromMe && !m.read,
        });
      }
    }
    return Array.from(byOther.values()).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [conversations, currentUser?.id]);

  const unreadCount = items.filter((it) => it.unread).length;

  const filtered = items.filter((it) => {
    if (tab === "unread" && !it.unread) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      it.otherName?.toLowerCase().includes(q) ||
      it.content?.toLowerCase().includes(q)
    );
  });

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
          u.position?.toLowerCase().includes(q) ||
          u.specialization?.toLowerCase().includes(q) ||
          u.college?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [suggestionPool, search]);

  const canSuggest = suggestionPool.length > 0;
  const suggestionLabel = currentUser?.role === "counselor" ? "Counselors & Admin" : "Counselors";

  const handleOpen = async (item) => {
    const cached = resolved[item.otherId];
    setChatRecipient(cached || { id: item.otherId, name: item.otherName });
    if (cached) return;
    const user = await lookupUser?.(item.otherId);
    if (!user) return;
    setResolved((prev) => ({ ...prev, [item.otherId]: user }));
    // Don't overwrite a different conversation opened while this lookup was in flight.
    setChatRecipient((prev) => (prev?.id === item.otherId ? user : prev));
  };

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col p-4 sm:p-6">
      <div className="w-full max-w-7xl mx-auto flex-1 min-h-0 flex flex-col">
        <PageHeader
          title="Messages"
          subtitle="All your conversations in one place."
        />

        <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden flex">
          {/* Conversation list */}
          <aside className={`${chatRecipient ? "hidden lg:flex" : "flex"} flex-col min-h-0 w-full lg:w-[360px] xl:w-[400px] lg:flex-none border-r border-gray-100`}>
            <div className="shrink-0 px-3 pt-3 pb-2 flex items-center gap-1.5">
              {[
                { id: "inbox", label: "Inbox", count: items.length },
                { id: "unread", label: "Unread", count: unreadCount },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium transition-colors ${
                    tab === t.id
                      ? "bg-maroon-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {t.label}
                  <span className={`text-xs tabular-nums ${tab === t.id ? "text-white/70" : "text-gray-400"}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            <div
              className="shrink-0 px-3 pb-3 relative"
              onMouseEnter={() => canSuggest && setShowSuggestions(true)}
              onMouseLeave={() => setShowSuggestions(false)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setShowSuggestions(false);
              }}
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search messages"
                  value={search}
                  onFocus={() => canSuggest && setShowSuggestions(true)}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (canSuggest) setShowSuggestions(true);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/25 focus:border-maroon-500 placeholder:text-gray-400"
                />
              </div>

              {canSuggest && showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute left-3 right-3 top-full -mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    {suggestionLabel}
                  </div>
                  <ul>
                    {searchSuggestions.map((u) => (
                      <li key={u.id}>
                        <button
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setChatRecipient(u);
                            setShowSuggestions(false);
                          }}
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

            <ul className="flex-1 min-h-0 overflow-y-auto">
              {filtered.length === 0 ? (
                <li className="px-4 py-14 text-center text-gray-500">
                  <MessageCircle className="mx-auto mb-3 text-gray-300" size={40} />
                  <p className="font-medium text-gray-700">
                    {tab === "unread" ? "You're all caught up" : "No conversations yet"}
                  </p>
                  <p className="text-sm mt-1">
                    {tab === "unread"
                      ? "Unread messages will show up here."
                      : "Search above to find someone to talk to."}
                  </p>
                </li>
              ) : (
                filtered.map((item) => {
                  const active = chatRecipient?.id === item.otherId;
                  const user = resolved[item.otherId];
                  return (
                    <li key={item.otherId}>
                      <button
                        onClick={() => handleOpen(item)}
                        className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors ${
                          active ? "bg-maroon-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <Avatar
                          name={item.otherName}
                          url={user?.avatarUrl}
                          size="md"
                          theme={user?.role === "college_rep" ? "rep" : user?.role}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className={`truncate ${item.unread ? "font-semibold text-gray-900" : "font-medium text-gray-800"}`}>
                              {item.otherName || "Unknown"}
                            </p>
                            <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums">
                              {relativeTime(item.timestamp)}
                            </span>
                          </div>
                          <p className={`text-sm line-clamp-2 mt-0.5 ${item.unread ? "text-gray-800" : "text-gray-500"}`}>
                            {item.fromMe && <span className="text-gray-400">You: </span>}
                            {item.content}
                          </p>
                        </div>
                        {item.unread && (
                          <span className="w-2 h-2 bg-maroon-600 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          {/* Conversation thread */}
          {chatRecipient ? (
            <div className="flex-1 min-w-0 min-h-0 flex">
              <ChatModal
                key={chatRecipient.id}
                inline
                recipientUser={chatRecipient}
                onClose={() => {
                  setChatRecipient(null);
                  fetchConversations().catch(() => undefined);
                }}
              />
            </div>
          ) : (
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-center px-6 text-gray-500">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 mb-3">
                <MessageCircle size={20} />
              </div>
              <p className="font-medium text-gray-700">Select a conversation</p>
              <p className="text-sm mt-1">Pick someone on the left, or start a new message.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
