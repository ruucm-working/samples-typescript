import { ApplicationFailure } from '@temporalio/common';

// @@@SNIPSTART typescript-hello-activity
export async function greet(name: string): Promise<string> {
  throw ApplicationFailure.nonRetryable('test nonretryable error');
  return `Hello, ${name}!`;
}
// @@@SNIPEND
