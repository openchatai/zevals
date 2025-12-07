import { type Message } from '../message';

/** A way of evaluating the subject's responses. */
export interface Criterion<Output> {
  name: string;

  evaluate(params: CriterionEvaluationParams): Promise<CriterionResult<Output>>;
}
export type CriterionEvaluationParams = {
  messages: Array<Message>;
};

/** The result of a criterion evaluation. */
export type CriterionResult<Output> = {
  output: Output;
  /** The reason for this outcomme */
  reason?: string;
  /** Error thrown during criterion evaluation. */
  error?: unknown;
  /** Whether the test passed or failed. Undefined if status was not determined during evaluation. */
  status?: 'success' | 'failure';
};

export const Criterion = {
  negate<T>(c: Criterion<T>): Criterion<T> {
    return {
      ...c,
      evaluate: async (params) => {
        const result = await c.evaluate(params);
        return {
          ...result,
          status:
            result.status === 'success'
              ? 'failure'
              : result.status === 'failure'
                ? 'success'
                : result.status,
        };
      },
    };
  },

  and<T, U>(c1: Criterion<T>, c2: Criterion<U>): Criterion<[T, U]> {
    return {
      name: `${c1.name} AND ${c2.name}`,

      evaluate: async (params) => {
        const [result1, result2] = await Promise.all([c1.evaluate(params), c2.evaluate(params)]);

        const reason = [result1.reason, result2.reason].filter(Boolean).join(' AND ');

        return {
          output: [result1.output, result2.output],
          reason,
          status:
            result1.status === 'success' && result2.status === 'success' ? 'success' : 'failure',
        };
      },
    };
  },

  pipe<T, U>(c: Criterion<T>, fn: (output: T) => U): Criterion<U> {
    return {
      ...c,
      evaluate: async (params) => {
        const result = await c.evaluate(params);
        return {
          ...result,
          output: fn(result.output),
        };
      },
    };
  },
};
