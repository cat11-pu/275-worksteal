// workq.js：队列取放与窃取（基线：一律给空表）
export function pushJob(queue, job) {
  return queue;
}

export function takeJob(queue, fromTail) {
  return [queue, null];
}
