// job-dispatcher.js
import { JobsClient } from "@google-cloud/run";
import "dotenv/config";

const PROJECT_ID = process.env.PROJECT_ID;
const REGION = process.env.REGION || "us-central1";
const WORKER_JOB_NAME = process.env.WORKER_JOB_NAME || "worker-job";
const TOTAL_TASK_COUNT = parseInt(process.env.TOTAL_TASK_COUNT || "10", 10);
// NOTE: Parallelism cannot be overridden
// const PARALLEL_TASKS = parseInt(process.env.PARALLEL_TASKS || "2", 10);

async function main() {
  const client = new JobsClient();
  const jobPath = client.jobPath(PROJECT_ID, REGION, WORKER_JOB_NAME);

  console.log(
    // NOTE: Parallelism cannot be overridden
    // `Dispatcher launching ${WORKER_JOB_NAME} with ${TOTAL_TASK_COUNT} tasks (parallelism=${PARALLEL_TASKS})`
    `Dispatcher launching ${WORKER_JOB_NAME} with ${TOTAL_TASK_COUNT} tasks`
  );

  const request = {
    name: jobPath,
    overrides: {
      taskCount: TOTAL_TASK_COUNT,
      // NOTE: Parallelism cannot be overridden
      // parallelism: PARALLEL_TASKS,
      containerOverrides: [
        {
          env: [{ name: "TOTAL_TASK_COUNT", value: String(TOTAL_TASK_COUNT) }],
        },
      ],
    },
  };

  // Fire-and-forget: don’t wait for job execution to finish
  // await client.runJob(request);
  // console.log(`Worker job dispatched. Dispatcher exiting.`);

  // Wait for the job execution to finish
  const [operation] = await client.runJob(request);
  console.log(
    `Worker job dispatched. Dispatcher will now wait for all jobs to complete.`
  );

  // If any one of the task in the job fails after the maxRetries is
  // reached, then the promise rejects and an error is thrown by the rejection
  const [response] = await operation.promise();

  console.log(
    `Job ${WORKER_JOB_NAME} completed with response ${JSON.stringify(
      response
    )}. Dispatcher will now exit.`
  );
}

main().catch(err => {
  console.error("Error dispatching worker job:", err);
  console.error("err:", JSON.stringify(err, null, 2));

  // If the process exits with a non-zero error code then
  // the task is retried
  process.exit(1);
});
