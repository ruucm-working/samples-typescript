// @@@SNIPSTART typescript-hello-workflow
import { ApplicationFailure, proxyActivities } from '@temporalio/workflow';
// Only import the activity types
import type * as activities from './activities';

const { greet } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

/** A workflow that simply calls an activity */
export async function example(name: string): Promise<string> {
  throw ApplicationFailure.retryable('message', 'foo-type');
  return await greet(name);
}
// @@@SNIPEND
