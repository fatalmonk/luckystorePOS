export class WorkflowEntrypoint<Env = unknown, T = unknown> {
  protected ctx: ExecutionContext;
  protected env: Env;

  constructor(ctx: ExecutionContext, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }

  async run(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _event: Readonly<WorkflowEvent<T>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _step: FakeWorkflowStep,
  ): Promise<unknown> {
    throw new Error("run must be implemented by subclass");
  }
}

export interface WorkflowEvent<T> {
  payload: T;
  timestamp: number;
  schedule?: { scheduledTime: string };
}

export abstract class FakeWorkflowStep {
  abstract do<T>(
    name: string,
    options: Record<string, unknown>,
    fn: () => Promise<T>,
  ): Promise<T>;
}

export type WorkflowStep = FakeWorkflowStep;
