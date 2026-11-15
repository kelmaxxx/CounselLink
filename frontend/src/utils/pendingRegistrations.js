// Which pending registration the J/K (or arrow) shortcuts move to. Wraps
// around the list; starting from no selection lands on the first or last entry.
export function nextActiveId(users, activeId, delta) {
  if (!users.length) return null;
  const current = users.findIndex((user) => user.id === activeId);
  if (current === -1) return users[delta > 0 ? 0 : users.length - 1].id;
  return users[(current + delta + users.length) % users.length].id;
}
