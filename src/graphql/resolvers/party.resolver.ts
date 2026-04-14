import { GraphQLError } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { Party } from '../../models/party.model';
import { partyRepository } from '../../repositories/party.repository';
import createLogger from '../../utils/logger';
import type { GraphQLContext } from '../context';
import { requireAuth } from '../context';

const logger = createLogger('@party.resolver');

export const partyResolvers = {
    // Scalar resolvers
    DateTime: DateTimeResolver,

    Query: {
        party: async (_: any, { id }: { id: number }, context?: GraphQLContext): Promise<Party | null> => {
            if (context) requireAuth(context);
            const result = await partyRepository.getById(id);

            if (result.isErr()) {
                logger.error('Error fetching party:', result.error);
                throw new GraphQLError('Failed to fetch party', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },

        parties: async (_: any = null, __: any = null, context?: GraphQLContext): Promise<Party[]> => {
            if (context) requireAuth(context);
            const result = await partyRepository.getAll();

            if (result.isErr()) {
                logger.error('Error fetching parties:', result.error);
                throw new GraphQLError('Failed to fetch parties', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },
    },
};