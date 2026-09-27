// workq.js：队列取放（不可变，返回新队列）
export function pushJob(queue, job) {
  return (queue || []).concat([job]);
}

export function takeJob(queue, fromTail) {
  const list = queue || [];
  if (list.length === 0) return [list, null];
  const next = list.slice();
  const job = fromTail ? next.pop() : next.shift();
  return [next, job];
}
