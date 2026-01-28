import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PORT } from './config/env';
import { connectToDatabase } from './database/db';
import { candidateResolvers } from './graphql/resolvers/candidate.resolver';

async function startServer() {
    const typeDefs = readFileSync(
        join(process.cwd(), 'src/graphql/schema/candidate.schema.graphql'),
        'utf-8'
    );

    const apolloServer = new ApolloServer({
        typeDefs,
        resolvers: candidateResolvers,
    });

    await connectToDatabase();
    console.log("Database connected");

    const { url } = await startStandaloneServer(apolloServer, {
        listen: { port: parseInt(PORT || '3000', 10) },
    });

    console.log(`Apollo Server is running on ${url}`);
}

startServer();