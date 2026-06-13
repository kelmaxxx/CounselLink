// Server-Sent Events (SSE) hub.
//
// Holds the open response streams for each connected user so any controller can
// push a lightweight "something changed" signal to a specific user or to every
// user of a given role. We deliberately do NOT send the changed data itself —
// just a typed signal (e.g. { type: "appointments" }) — and the frontend
// re-runs its normal REST fetch. That keeps this hub tiny and avoids
// duplicating query/permission logic here.
//
// Browsers reconnect EventSource automatically, so we only track live streams;
// there is nothing to persist.

const clients = new Map(); // userId -> Set<res>

// Register an open SSE response for a user. Returns a cleanup function that
// removes it (call this when the connection closes).
export const addClient = (user, res) => {
  if (!clients.has(user.id)) clients.set(user.id, new Set());
  const set = clients.get(user.id);
  res.locals.role = user.role; // so notifyRole can match without a second map
  set.add(res);

  return () => {
    set.delete(res);
    if (set.size === 0) clients.delete(user.id);
  };
};

const send = (res, event) => {
  try {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch {
    // Stream already closed; the 'close' handler will clean it up.
  }
};

// Push an event to every live connection belonging to one user.
export const notifyUser = (userId, event) => {
  const set = clients.get(userId);
  if (!set) return;
  for (const res of set) send(res, event);
};

// Push an event to every connected user that has the given role.
export const notifyRole = (role, event) => {
  for (const set of clients.values()) {
    for (const res of set) {
      if (res.locals?.role === role) send(res, event);
    }
  }
};
