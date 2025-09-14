# Cloud Run Jobs - Learnings and Setup Notes

This repository contains my notes and experience while setting up **Google Cloud Run Jobs** with GitHub Actions, Docker, and programmatic dispatching.

---

## Key Learnings

### 1. Override Job Configuration for a Specific Execution

- Cloud Run Jobs - Task Timeout: [Task Timeout](https://cloud.google.com/run/docs/configuring/task-timeout#gcloud)
- Client Library HOW TO: [Client Library 101](https://github.com/googleapis/gax-nodejs/blob/main/client-libraries.md#long-running-operations)
- Documentation: [Override Job Config](https://cloud.google.com/run/docs/execute/jobs#override-job-configuration)
- Node.js API reference: [JobsClient `runJob` overrides](https://cloud.google.com/nodejs/docs/reference/run/latest/run/protos.google.cloud.run.v2.runjobrequest.ioverrides)

You can execute a job programmatically and **override arguments or environment variables** for that execution. For example, to specify where input data is located.

**Important:**

- Only **environment variables** and **task count** can be overridden at execution time.
- **Parallelism** cannot be overridden; it must be updated via the CLI or job configuration.
- See [`job-dispatcher.js`](./job-dispatcher.js) for implementation details.

---

### 2. Google Cloud Setup

1. Run the setup script once with your `PROJECT_ID`:

```bat
scripts/setup-gcp-sa-gh.bat
```

2. This generates `key.json` for the service account.
3. Add the following secrets in GitHub Actions:

| Name             | Notes                                |
| ---------------- | ------------------------------------ |
| `GCP_PROJECT_ID` | Your Google Cloud project ID         |
| `GCP_REGION`     | Default region (e.g., `us-central1`) |
| `GCP_SA_KEY`     | Contents of `key.json`               |

4. Define **environment-specific variables** in GitHub under:

```
Settings → Environments → PRODUCTION / DEVELOPMENT
```

- This allows separate deployments per environment.
- Reference them in workflows using:

```yaml
${{ vars.ENV_VAR }}
```

- Use in a job:

```yaml
jobs:
  deploy:
    environment: PRODUCTION
```

---

## GitHub Actions Workflow

**Partial example from `.github/workflows/deploy.yml`:**

```yaml
name: Deploy Cloud Run Jobs

on:
  push:
    branches: ["main"]

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: ${{ secrets.GCP_REGION }}
  REPO_NAME: cloud-run-jobs
  IMAGE_NAME: jobs-image
  WORKER_JOB_NAME: ${{ vars.WORKER_JOB_NAME }}
  TOTAL_TASK_COUNT: ${{ vars.TOTAL_TASK_COUNT }}
  PARALLEL_TASKS: ${{ vars.PARALLEL_TASKS }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: PRODUCTION

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Configure Docker
        run: gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

      - name: Log environment variables
        run: |
          echo "===== Listing environment variables ====="
          echo "REPO_NAME=$REPO_NAME"
          echo "IMAGE_NAME=$IMAGE_NAME"
          echo "WORKER_JOB_NAME=$WORKER_JOB_NAME"
          echo "TOTAL_TASK_COUNT=$TOTAL_TASK_COUNT"
          echo "PARALLEL_TASKS=$PARALLEL_TASKS"
          echo "========================================"
```

The workflow also builds the Docker image, pushes it to Artifact Registry, and creates/updates the **Worker** and **Dispatcher** Cloud Run Jobs.

---

## Worker Job (`worker.js`)

Processes a single task at a time:

```js
const TOTAL_TASK_COUNT = process.env.CLOUD_RUN_TASK_COUNT || "10";
const TASK_INDEX = process.env.CLOUD_RUN_TASK_INDEX || "0";

// TASK_INDEX is 0-indexed
console.log(`Task ${TASK_INDEX + 1} of ${TOTAL_TASK_COUNT} is complete.`);
process.exit(0);
```

---

## Dispatcher Job (`job-dispatcher.js`)

- Determines the number of tasks required
- Launches the worker job programmatically with overrides
- It self has a max-retry of 0. If the job-dispatcher fails, then we do not retry it.
- Uses environment variables to distribute work

```js
import { JobsClient } from "@google-cloud/run";
import "dotenv/config";

const PROJECT_ID = process.env.PROJECT_ID;
const REGION = process.env.REGION || "us-central1";
const WORKER_JOB_NAME = process.env.WORKER_JOB_NAME || "worker-job";
const TOTAL_TASK_COUNT = parseInt(process.env.TOTAL_TASK_COUNT || "10", 10);

async function main() {
  const client = new JobsClient();
  const jobPath = client.jobPath(PROJECT_ID, REGION, WORKER_JOB_NAME);

  console.log(
    `Dispatcher launching ${WORKER_JOB_NAME} with ${TOTAL_TASK_COUNT} tasks`
  );

  // Fire-and-forget
  await client.runJob({
    name: jobPath,
    overrides: {
      taskCount: TOTAL_TASK_COUNT,
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
```

**Notes:**

- `client.runJob()` returns an array of object representing the operation
  `js
// Run request
const [operation] = await runClient.runJob(request);
const [response] = await operation.promise();
console.log(response);
`
- Awaiting `operation.promise()` only resolves when all tasks are complete (successful, partially successful, or failed).
- This can be leveraged for metrics collection or monitoring.

---

### References

- [Cloud Run Jobs - Execute Job Code Sample](https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-run/samples/generated/v2/jobs.run_job.js)
- [Cloud Run Jobs - Using the Client Library](https://googleapis.dev/nodejs/run/latest/#using-the-client-library)
- [Google Cloud Node.js Run API](https://cloud.google.com/nodejs/docs/reference/run/latest/run/protos.google.cloud.run.v2.runjobrequest.ioverrides)
