import { z, ZodObject, ZodRawShape } from 'zod';
import { Agent } from './agent';
import { Criterion, CriterionResult } from './criteria/criterion';
import { Message } from './message';
import { Segment, SegmentEvaluationPromise } from './segment';
import { groupBy } from './utils';

export type EvaluatedSegment =
  | { type: 'message'; message: Message }
  | {
      type: 'eval';
      evalResult: CriterionResult<any>;
      criterion: Criterion<any>;
    };

/** An AI to be used for extracting structured output from the conversation. */
export interface Judge {
  invoke<Shape extends ZodRawShape, T extends ZodObject<Shape>>(params: {
    messages: Array<Message>;
    schema: T;
  }): Promise<{ output: z.infer<T> }>;
}

/**
 * Evaluates the scenario (`segments`) against the agent.
 */
export async function evaluate<A extends Agent>({
  agent,
  segments,
}: {
  agent: A | (() => Promise<A>);
  /** The {@link Segment}s to evaluate `this.params.agent` against. */
  segments: Array<Segment<A>>;
}) {
  // Initialize the agent
  const _agent = typeof agent === 'function' ? await agent() : agent;

  const evaluatedSegmentPromises: Array<SegmentEvaluationPromise> = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    const previousActualMessages = evaluatedSegmentPromises.flatMap((m) =>
      m.type === 'message' ? [m.message] : [],
    );

    const segmentResult = await segment.evaluate({ agent: _agent, previousActualMessages });

    evaluatedSegmentPromises.push(...segmentResult);
  }

  const results: EvaluatedSegment[] = await Promise.all(
    evaluatedSegmentPromises.map((res) => {
      if (res.type === 'eval') {
        return res.evalResult.then((evalResult) => ({
          type: 'eval' as const,
          evalResult,
          criterion: res.criterion,
        }));
      } else {
        return res;
      }
    }),
  );

  const getResult = <T>(criterion: Criterion<T>): CriterionResult<T> | undefined => {
    const res = results.find((r) => r.type === 'eval' && r.criterion === criterion);

    return (res as { evalResult: CriterionResult<T> } | undefined)?.evalResult;
  };

  const resultsByStatus = groupBy(
    results.flatMap((r) => (r.type === 'eval' && r.evalResult.status ? [r] : [])),
    (r) => r.evalResult.status ?? ('unknown' as const),
  );

  return {
    /** Evaluation history, including messages and eval results. */
    results,
    /** Evaluation results grouped by status. */
    resultsByStatus,
    /** Resulting messages. */
    messages: evaluatedSegmentPromises.flatMap((m) => (m.type === 'message' ? [m.message] : [])),

    /** True if no evals failed. */
    success: resultsByStatus.failure.length === 0,

    /**
     * Get all evaluation results for this particular criterion instance (using reference equality).
     */
    getResults: <T>(criterion: Criterion<T>): CriterionResult<T>[] => {
      return results.flatMap((r) =>
        r.type === 'eval' && r.criterion === criterion ? [r.evalResult] : [],
      );
    },

    /**
     * Gets the first result of a given criterion instance (using reference equality).
     */
    getResult,

    /**
     * Gets the first result of a given criterion instance (using reference equality)
     * @throws if the criterion is not found.
     * **Note**: Use `getResults` as a safer alternative.
     */
    getResultOrThrow: <T>(criterion: Criterion<T>): CriterionResult<T> => {
      const res = getResult(criterion);

      if (!res) {
        throw new Error(`Cannot find results for criterion ${criterion.name}`);
      }

      return res;
    },
  };
}
