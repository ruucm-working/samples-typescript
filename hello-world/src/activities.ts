import { WorkflowClient } from '@temporalio/client';

// @@@SNIPSTART typescript-hello-activity
export async function greet(name: string): Promise<string> {
  const client = new WorkflowClient();
  return `Hello, ${name + client}!`;
}
// @@@SNIPEND
