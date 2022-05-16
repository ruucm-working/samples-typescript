import * as wf from '@temporalio/workflow';
import type * as activities from './activities';

export async function httpWorkflow(): Promise<string> {
  const {
    makeHTTPRequest,
    // cancellableFetch  // todo: demo usage
  } = wf.proxyActivities<typeof activities>({
    retry: {
      initialInterval: '50 milliseconds',
      maximumAttempts: 2,
    },
    startToCloseTimeout: '30 seconds',
  });

  const answer = await makeHTTPRequest();
  return `The answer is ${answer}`;
}
