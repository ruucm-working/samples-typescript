import * as wf from '@temporalio/workflow';
import type { coresdk } from '@temporalio/proto';

export type SignalArgs<Def extends wf.SignalDefinition> = Def extends wf.SignalDefinition<infer Args> ? Args : never;

export interface SignalManagerConfig {
  bufferSignalEventCountThreshold: number;
  maxConcurrentSignalHandlers: number;
}

class SignalManager {
  numRunningHandlers = 0;
  numPendingHandlers = 0;
  public readonly buffer = Array<wf.SignalInput>();

  constructor(
    public readonly config: SignalManagerConfig = {
      bufferSignalEventCountThreshold: 1000,
      maxConcurrentSignalHandlers: Infinity,
    }
  ) {}

  async wrapSignalHandler(input: wf.SignalInput, next: wf.Next<wf.WorkflowInboundCallsInterceptor, 'handleSignal'>) {
    this.numPendingHandlers++;
    await wf.condition(() => this.numRunningHandlers < this.config.maxConcurrentSignalHandlers);
    this.numPendingHandlers--;

    if (wf.taskInfo().historyLength >= this.config.bufferSignalEventCountThreshold) {
      this.buffer.push(input);
    } else {
      this.numRunningHandlers++;
      try {
        await next(input);
      } finally {
        this.numRunningHandlers--;
      }
    }
  }

  async readyToContinueAsNew() {
    await wf.condition(() => this.numPendingHandlers === 0 && this.numRunningHandlers === 0);
  }
}

const someSignal = wf.defineSignal<[number]>('something');

export async function someWorkflow(): Promise<void> {
  wf.setHandler(someSignal, async (_x) => {
    // run some activity or other async work here
  });
  await wf.condition(() => wf.taskInfo().historyLength >= 2000);
  await wf.continueAsNew<typeof someWorkflow>();
}

export const interceptors: wf.WorkflowInterceptorsFactory = () => {
  const bufferedSignals = (wf.workflowInfo().memo?.bufferedSignals ?? []) as wf.SignalInput[];
  const sm = new SignalManager();
  let activatedOnce = false;
  return {
    internals: [
      {
        activate(input, next) {
          if (activatedOnce) return next(input);
          activatedOnce = true;
          const jobs = bufferedSignals.map(
            (signal): coresdk.workflow_activation.IWorkflowActivationJob => ({
              signalWorkflow: signal,
            })
          );
          return next({
            ...input,
            activation: { ...input.activation, jobs: jobs.concat(input.activation.jobs ?? []) },
          });
        },
      },
    ],
    outbound: [
      {
        async continueAsNew(input, next) {
          await sm.readyToContinueAsNew();
          return await next({
            ...input,
            options: { ...input.options, memo: { ...input.options.memo, bufferedSignals: sm.buffer } },
          });
        },
      },
    ],
    inbound: [
      {
        async handleSignal(input, next) {
          return await sm.wrapSignalHandler(input, next);
        },
      },
    ],
  };
};
