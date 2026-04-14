import { GraphQLError } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import createLogger from '../../utils/logger';
import { ElectionResult } from '../../models/election_result.model';
import { electionResultRepository } from '../../repositories/election_result.repository';
import type { GraphQLContext } from '../context';
import { requireAuth } from '../context';

const logger = createLogger('@election_result.resolver');

export const electionResultResolvers = {
    // Scalar resolvers
    DateTime: DateTimeResolver,

    Query: {
        election_result: async (_: any, { id }: { id: number }, context?: GraphQLContext): Promise<ElectionResult | null> => {
            if (context) requireAuth(context);
            const result = await electionResultRepository.getById(id);

            if (result.isErr()) {
                logger.error('Error fetching election result:', result.error);
                throw new GraphQLError('Failed to fetch election result', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },

        election_results: async (_: any = null, __: any = null, context?: GraphQLContext): Promise<ElectionResult[]> => {
            if (context) requireAuth(context);
            const result = await electionResultRepository.getAll();

            if (result.isErr()) {
                logger.error('Error fetching election results:', result.error);
                throw new GraphQLError('Failed to fetch election results', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },

        constituency_results: async (_: any, { constituency_id, election_year }: { constituency_id: number; election_year: number }, context?: GraphQLContext) => {
            if (context) requireAuth(context);
            const result = await electionResultRepository.getByConstituencyIdAndYear(constituency_id, election_year);
            if (result.isErr()) {
                throw new GraphQLError('Failed to fetch constituency results', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }
            return result.value;
        },

        election_resultsByCandidateIds: async (
            _: any,
            { election_candidate_ids }: { election_candidate_ids: number[] },
            context?: GraphQLContext
        ): Promise<ElectionResult[]> => {
            if (context) requireAuth(context);
            const result = await electionResultRepository.getByElectionCandidateIds(
                election_candidate_ids
            );
            if (result.isErr()) {
                logger.error("Error fetching election results by candidate ids:", result.error);
                throw new GraphQLError("Failed to fetch election results", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
            return result.value;
        },
    },
};