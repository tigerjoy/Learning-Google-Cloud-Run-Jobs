// job-dispatcher.js
import { JobsClient } from "@google-cloud/run";

const PROJECT_ID = process.env.GCP_PROJECT;
const REGION = process.env.GCP_REGION || "us-central1";
const WORKER_JOB_NAME = process.env.WORKER_JOB_NAME || "worker-job";
const TOTAL_TASK_COUNT = parseInt(process.env.TOTAL_TASK_COUNT || "10", 10);
const PARALLEL_TASKS = parseInt(process.env.PARALLEL_TASKS || "2", 10);

async function main() {
  const client = new JobsClient();
  const jobPath = client.jobPath(PROJECT_ID, REGION, WORKER_JOB_NAME);

  console.log(
    `Dispatcher launching ${WORKER_JOB_NAME} with ${TOTAL_TASK_COUNT} tasks (parallelism=${PARALLEL_TASKS})`
  );

  // Fire-and-forget: don’t wait for job execution to finish
  await client.runJob({
    name: jobPath,
    overrides: {
      taskCount: TOTAL_TASK_COUNT,
      parallelism: PARALLEL_TASKS,
      containerOverrides: [
        {
          env: [{ name: "TOTAL_TASK_COUNT", value: String(TOTAL_TASK_COUNT) }],
        },
      ],
    },
  });

  console.log(`Worker job dispatched. Dispatcher exiting.`);
}

main().catch(err => {
  console.error("Error dispatching worker job:", err);
  process.exit(1);
});
