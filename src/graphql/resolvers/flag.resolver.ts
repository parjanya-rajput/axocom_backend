import { GraphQLError } from "graphql";
import { flagRepository } from "../../repositories/flag.repository";
import { FlagRow } from "../../models/flag.model";
import createLogger from "../../utils/logger";
import type { GraphQLContext } from "../context";
import { requireAuth } from "../context";

const logger = createLogger("@flag.resolver");

export const flagResolvers = {
    Query: {
        myFlagDataByUrl: async (
            _: unknown,
            { url }: { url: string },
            context?: GraphQLContext
        ): Promise<FlagRow[]> => {
            if (context) requireAuth(context);
            const userEmail = context?.user?.email?.trim().toLowerCase();
            if (!userEmail) {
                throw new GraphQLError("Unauthorized", {
                    extensions: { code: "UNAUTHORIZED" },
                });
            }
            if (!url?.trim()) {
                throw new GraphQLError("url is required", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }

            const result = await flagRepository.getByEmailAndUrl(userEmail, url.trim());
            if (result.isErr()) {
                logger.error("Error fetching flag data by url:", result.error);
                throw new GraphQLError("Failed to fetch flag data", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }

            return result.value;
        },
    },
    Mutation: {
        submitFlagData: async (
            _: unknown,
            { data, email }: { data: string; email: string },
            context?: GraphQLContext
        ): Promise<FlagRow> => {
            if (context) requireAuth(context);
            if (!email?.trim()) {
                throw new GraphQLError("email is required", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }
            // Validate that the supplied string is valid JSON before persisting.
            try {
                JSON.parse(data);
            } catch {
                throw new GraphQLError("data must be a valid JSON string", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }

            const result = await flagRepository.create(email.trim().toLowerCase(), data);

            if (result.isErr()) {
                logger.error("Error saving flag data:", result.error);
                throw new GraphQLError("Failed to save flag data", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }

            return result.value;
        },
    },
};
