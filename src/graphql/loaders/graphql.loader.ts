import { readFileSync } from "fs";
import { join } from "path";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import { candidateResolvers } from "../resolvers/candidate.resolver";
import { voterResolvers } from "../resolvers/voter.resolver";

const schemaPath = join(process.cwd(), "src/graphql/schema");

export function buildGraphQL() {
    const typeDefsArray = loadFilesSync(schemaPath, {
        extensions: ["gql", "graphql"],
        recursive: true,
        requireMethod: (path: string) => readFileSync(path, "utf-8"),
    });

    const typeDefs = mergeTypeDefs(typeDefsArray);
    const resolvers = mergeResolvers([candidateResolvers, voterResolvers]);

    return { typeDefs, resolvers };
}