import { GraphQLError } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import createLogger from '../../utils/logger';
import { Election } from '../../models/election.model';
import { electionRepository } from '../../repositories/election.repository';
import type { GraphQLContext } from '../context';
import { requireAuth } from '../context';

const logger = createLogger('@election.resolver');

export const electionResolvers = {
    // Scalar resolvers
    DateTime: DateTimeResolver,

    Query: {
        election: async (_: any, { id }: { id: number }, context?: GraphQLContext): Promise<Election | null> => {
            if (context) requireAuth(context);
            const result = await electionRepository.getById(id);

            if (result.isErr()) {
                logger.error('Error fetching election:', result.error);
                throw new GraphQLError('Failed to fetch election', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },

        elections: async (_: any = null, __: any = null, context?: GraphQLContext): Promise<Election[]> => {
            if (context) requireAuth(context);
            const result = await electionRepository.getAll();

            if (result.isErr()) {
                logger.error('Error fetching elections:', result.error);
                throw new GraphQLError('Failed to fetch elections', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },

        electionByConstituencyAndYear: async (
            _: any,
            { constituency_id, year }: { constituency_id: number; year: number },
            context?: GraphQLContext
        ): Promise<Election | null> => {
            if (context) requireAuth(context);
            const result = await electionRepository.getByConstituencyIdAndYear(constituency_id, year);
            if (result.isErr()) {
                logger.error('Error fetching election:', result.error);
                throw new GraphQLError('Failed to fetch election by constituency and year', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }
            return result.value;
        },

        electionsByConstituencyId: async (
            _: any,
            { constituency_id }: { constituency_id: number },
            context?: GraphQLContext
        ): Promise<Election[]> => {
            if (context) requireAuth(context);
            const result = await electionRepository.getByConstituencyId(constituency_id);
            if (result.isErr()) {
                logger.error('Error fetching elections by constituency:', result.error);
                throw new GraphQLError('Failed to fetch elections by constituency', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }
            return result.value;
        },

        electionsByStateAndYear: async (
            _: any,
            { state, year }: { state: string; year: number },
            context?: GraphQLContext
        ): Promise<Election[]> => {
            if (context) requireAuth(context);
            const result = await electionRepository.getByStateAndYear(state, year);
            if (result.isErr()) {
                logger.error('Error fetching elections by state and year:', result.error);
                throw new GraphQLError('Failed to fetch elections by state and year', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }
            return result.value;
        },
    },
};