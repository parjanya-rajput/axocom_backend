import { GraphQLError } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { Voter } from '../../models/voter.model';
import { voterRepository } from '../../repositories/voter.repository';
import createLogger from '../../utils/logger';

const logger = createLogger('@voter.resolver');

export const voterResolvers = {
    // Scalar resolvers
    DateTime: DateTimeResolver,

    Query: {
        voter: async (_: any, { id }: { id: number }): Promise<Voter | null> => {
            const result = await voterRepository.getById(id);

            if (result.isErr()) {
                logger.error('Error fetching voter:', result.error);
                throw new GraphQLError('Failed to fetch voter', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },

        voters: async (): Promise<Voter[]> => {
            const result = await voterRepository.getAll();

            if (result.isErr()) {
                logger.error('Error fetching voters:', result.error);
                throw new GraphQLError('Failed to fetch voters', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },
    },
};