/** Step durations for the `Server-Timing` response header. Carries names and milliseconds only. */
export function createServerTiming(now: () => number = () => performance.now()) {
  const startedAt = now();
  const steps: { name: string; duration: number }[] = [];

  return {
    async measure<T>(name: string, step: () => PromiseLike<T> | T): Promise<T> {
      const start = now();
      try {
        return await step();
      } finally {
        steps.push({ name, duration: now() - start });
      }
    },
    header() {
      return [...steps, { name: "total", duration: now() - startedAt }]
        .map(({ name, duration }) => `${name};dur=${duration.toFixed(1)}`)
        .join(", ");
    },
  };
}
