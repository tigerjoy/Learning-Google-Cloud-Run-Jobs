// worker.js
const TOTAL_TASK_COUNT = Number(process.env.CLOUD_RUN_TASK_COUNT || "10");
const TASK_INDEX = Number(process.env.CLOUD_RUN_TASK_INDEX || "0");

// TASK_INDEX is 0-indexed
console.log(`Task ${TASK_INDEX + 1} of ${TOTAL_TASK_COUNT} has started.`);

if (TASK_INDEX === 3) {
  throw new Error(`Purposefully failing Task with index ${TASK_INDEX}`);
}

console.log(`Task ${TASK_INDEX + 1} of ${TOTAL_TASK_COUNT} is complete.`);
process.exit(0);
