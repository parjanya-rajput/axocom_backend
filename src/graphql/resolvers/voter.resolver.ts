import { GraphQLError } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { Voter } from '../../models/voter.model';
import {
    voterRepository,
    type PaginatedVoterResult,
    type VoterFilterOptionsByAssemblyResult,
    type VoterFilterOptionsResult,
} from '../../repositories/voter.repository';
import createLogger from '../../utils/logger';
import type { GraphQLContext } from '../context';
import { requireAuth } from '../context';
import { buildVotersCsv } from '../../utils/voter-csv';

const logger = createLogger('@voter.resolver');

export const voterResolvers = {
    // Scalar resolvers
    DateTime: DateTimeResolver,

    Query: {
        voter: async (_: any, { id }: { id: number }, context?: GraphQLContext): Promise<Voter | null> => {
            if (context) requireAuth(context);
            const result = await voterRepository.getById(id);

            if (result.isErr()) {
                logger.error('Error fetching voter:', result.error);
                throw new GraphQLError('Failed to fetch voter', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },

        voters: async (_: any = null, __: any = null, context?: GraphQLContext): Promise<Voter[]> => {
            if (context) requireAuth(context);
            const result = await voterRepository.getAll();

            if (result.isErr()) {
                logger.error('Error fetching voters:', result.error);
                throw new GraphQLError('Failed to fetch voters', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },
        voterAgeBucketsByState: async (
            _: any,
            { state }: { state: string },
            context?: GraphQLContext
        ): Promise<{ group: string; total: number }[]> => {
            if (context) requireAuth(context);
            const result = await voterRepository.getAgeBucketsByState(state);

            if (result.isErr()) {
                logger.error("Error fetching voter age buckets:", result.error);
                throw new GraphQLError("Failed to fetch voter age buckets", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }

            // Map DB row shape to GraphQL field names
            return result.value.map((row) => ({
                group: row.age_group,
                total: row.total,
            }));
        },

        voterFilterOptions: async (_: any, __: any, context?: GraphQLContext): Promise<VoterFilterOptionsResult> => {
            if (context) requireAuth(context);
            const result = await voterRepository.getFilterOptions();

            if (result.isErr()) {
                logger.error('Error fetching voter filter options:', result.error);
                throw new GraphQLError('Failed to fetch voter filter options', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },

        voterFilterOptionsByAssembly: async (
            _: any,
            { assembly_constituency }: { assembly_constituency: string },
            context?: GraphQLContext
        ): Promise<VoterFilterOptionsByAssemblyResult> => {
            if (context) requireAuth(context);
            if (!assembly_constituency || assembly_constituency === "ALL") {
                return {
                    parliamentary_constituencies: [],
                    part_number_names: [],
                };
            }

            const result = await voterRepository.getFilterOptionsByAssembly(
                assembly_constituency
            );

            if (result.isErr()) {
                logger.error(
                    "Error fetching voter filter options by assembly:",
                    result.error
                );
                throw new GraphQLError(
                    "Failed to fetch voter filter options by assembly",
                    {
                        extensions: { code: "INTERNAL_SERVER_ERROR" },
                    }
                );
            }

            return result.value;
        },

        votersPaginated: async (
            _: any,
            args: {
                page?: number;
                limit?: number;
                search?: string;
                assembly_constituency?: string;
                parliamentary_constituency?: string;
                part_number_name?: string;
            },
            context?: GraphQLContext
        ): Promise<PaginatedVoterResult> => {
            if (context) requireAuth(context);
            const page = args.page ?? 1;
            const limit = args.limit ?? 10;

            const result = await voterRepository.getPaginated({
                page,
                limit,
                search: args.search ?? null,
                assembly_constituency: args.assembly_constituency ?? null,
                parliamentary_constituency: args.parliamentary_constituency ?? null,
                part_number_name: args.part_number_name ?? null,
            });

            if (result.isErr()) {
                logger.error('Error fetching paginated voters:', result.error);
                throw new GraphQLError('Failed to fetch voters', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return result.value;
        },

        votersExportCsv: async (
            _: any,
            args: {
                assembly_constituency: string;
                parliamentary_constituency?: string | null;
                part_number_name?: string | null;
            },
            context?: GraphQLContext
        ): Promise<string> => {
            if (context) requireAuth(context);
            const { assembly_constituency, parliamentary_constituency, part_number_name } = args;

            if (!assembly_constituency || assembly_constituency === "ALL") {
                throw new GraphQLError(
                    'assembly_constituency must be selected (not "ALL")',
                    { extensions: { code: "BAD_USER_INPUT" } }
                );
            }

            const result = await voterRepository.getForExport(
                assembly_constituency,
                parliamentary_constituency ?? null,
                part_number_name ?? null
            );

            if (result.isErr()) {
                logger.error("Error exporting voters:", result.error);
                throw new GraphQLError("Failed to export voters CSV", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }

            return buildVotersCsv(result.value);
        },
    },
};