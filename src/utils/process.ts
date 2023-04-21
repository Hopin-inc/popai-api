export const getMemoryUsage = () => {
  const memoryUsage = process.memoryUsage();
  for (const key in memoryUsage) {
    memoryUsage[key] = Math.round(memoryUsage[key] / 1024 / 1024 * 100) / 100;
  }
  return memoryUsage;
};

export const runInParallel = async <T, R>(data: T[], fn: (item: T) => Promise<R>, parallelCount: number): Promise<R[]> => {
  const chunks = Array.from({ length: parallelCount }, () => []);
  data.forEach((item, index) => {
    const chunkIndex = index % parallelCount;
    chunks[chunkIndex].push(item);
  });
  const results = await Promise.all(
    chunks.map(chunk => Promise.all(chunk.map(item => fn(item)))),
  );
  return results.flat();
};
