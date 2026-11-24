/**
 * Remembers, per user, the last day a job completed in this server process, so
 * a job that only changes once a day is not repeated on every request. A restart
 * forgets everything, which only means the job runs once more.
 */
export function createDailyGate(maxEntries = 10_000) {
  const doneOn = new Map<string, string>();
  return {
    isDone: (key: string, today: string) => doneOn.get(key) === today,
    markDone(key: string, today: string) {
      if (doneOn.size >= maxEntries && !doneOn.has(key)) doneOn.clear();
      doneOn.set(key, today);
    },
    forget: (key: string) => { doneOn.delete(key); },
  };
}
