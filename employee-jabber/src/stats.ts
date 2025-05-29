type Stats = {
  emailsReceived: number;
  postsMade: number;
  emailsSent: number;
  errors: number;
};
const runtimeStats: Stats & { employeeStats: Record<string, Stats> } = {
  emailsReceived: 0,
  postsMade: 0,
  errors: 0,
  emailsSent: 0,
  employeeStats: {},
};

export function get(): Stats {
  return structuredClone(runtimeStats);
}

export function incrementOverall(key: keyof Stats) {
  runtimeStats[key] += 1;
}

export function incrementForEmployee(
  name: string,
  key: keyof Stats,
  mode: "increment-overall" | "skip-overall" = "increment-overall",
) {
  const stats = runtimeStats.employeeStats[name] ?? {
    emailsReceived: 0,
    postsMade: 0,
    emailsSent: 0,
  };

  stats[key] += 1;
  runtimeStats.employeeStats[name] = stats;
  if (mode === "skip-overall") {
    return;
  }

  incrementOverall(key);
}
