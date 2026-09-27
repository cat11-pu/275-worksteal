// workq.js：队列取放与窃取（纯函数，不改入参）
export function pushJob(queue, job) {
  return queue.concat([job]);
}

export function takeJob(queue, fromTail) {
  if (!queue.length) return [queue.slice(), null];
  if (fromTail) return [queue.slice(0, -1), queue[queue.length - 1]];
  return [queue.slice(1), queue[0]];
}
