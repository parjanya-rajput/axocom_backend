import { GraphQLError } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import createLogger from '../../utils/logger';
import { electionCandidateRepository } from '../../repositories/election_candidate.repository';
import { ElectionCandidate } from '../../models/election_candidate.model';

const logger = createLogger('@election_candidate.resolver');

export const electionCandidateResolvers = {
    // Scalar resolvers
    DateTime: DateTimeResolver,

    Query: {
        election_candidate: async (_: any, { id }: { id: number }): Promise<ElectionCandidate | null> => {
            const result = await electionCandidateRepository.getById(id);

            if (result.isErr()) {
                logger.error('Error fetching election candidate:', result.error);
                throw new GraphQLError('Failed to fetch election candidate', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },

        election_candidates: async (): Promise<ElectionCandidate[]> => {
            const result = await electionCandidateRepository.getAll();

            if (result.isErr()) {
                logger.error('Error fetching election candidates:', result.error);
                throw new GraphQLError('Failed to fetch election candidates', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },
    },
};