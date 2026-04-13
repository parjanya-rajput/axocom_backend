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

const logger = createLogger('@voter.resolver');

function csvEscape(value: unknown) {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

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
        voterAgeBucketsByState: async (
            _: any,
            { state }: { state: string }
        ): Promise<{ group: string; total: number }[]> => {
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

        voterFilterOptions: async (): Promise<VoterFilterOptionsResult> => {
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
            { assembly_constituency }: { assembly_constituency: string }
        ): Promise<VoterFilterOptionsByAssemblyResult> => {
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
            }
        ): Promise<PaginatedVoterResult> => {
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
            }
        ): Promise<string> => {
            const { assembly_constituency, parliamentary_constituency } = args;

            if (!assembly_constituency || assembly_constituency === "ALL") {
                throw new GraphQLError(
                    'assembly_constituency must be selected (not "ALL")',
                    { extensions: { code: "BAD_USER_INPUT" } }
                );
            }

            const result = await voterRepository.getForExport(
                assembly_constituency,
                parliamentary_constituency ?? null
            );

            if (result.isErr()) {
                logger.error("Error exporting voters:", result.error);
                throw new GraphQLError("Failed to export voters CSV", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }

            const rows = result.value;
            // Export CSV columns to match `backend/src/models/voter.model.ts` table shape.
            // Note: GraphQL `Voter` type contains `updated_at`, but it is not present in the DB schema
            // defined in `CREATE_VOTER_TABLE` and the TS `Voter` model; so we export model fields only.
            const header = [
                "epic_number",
                "first_name_english",
                "first_name_local",
                "last_name_english",
                "last_name_local",
                "gender",
                "age",
                "relative_first_name_english",
                "relative_first_name_local",
                "relative_last_name_english",
                "relative_last_name_local",
                "state",
                "parliamentary_constituency",
                "assembly_constituency",
                "polling_station",
                "part_number_name",
                "part_serial_number",
            ];

            const csvLines: string[] = [];
            csvLines.push(header.map(csvEscape).join(","));

            for (const v of rows) {
                csvLines.push(
                    [
                        v.epic_number,
                        v.first_name_english,
                        v.first_name_local,
                        v.last_name_english,
                        v.last_name_local,
                        v.gender,
                        v.age,
                        v.relative_first_name_english,
                        v.relative_first_name_local,
                        v.relative_last_name_english,
                        v.relative_last_name_local,
                        v.state,
                        v.parliamentary_constituency,
                        v.assembly_constituency,
                        v.polling_station,
                        v.part_number_name,
                        v.part_serial_number,
                    ]
                        .map(csvEscape)
                        .join(",")
                );
            }

            return csvLines.join("\n");
        },
    },
};