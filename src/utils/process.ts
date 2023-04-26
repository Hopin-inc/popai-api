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

export const runInOrder = async <T, R>(data: T[], fn: (arr: T[]) => Promise<R>, chunkCount: number): Promise<R[]> => {
  const chunks: T[][] = [];
  for (let i = 0; i < data.length; i += chunkCount) {
    chunks.push(data.slice(i, i + chunkCount));
  }
  const results: R[] = [];
  for (const chunk of chunks) {
    const result = await fn(chunk);
    results.push(result);
  }
  return results;
};
