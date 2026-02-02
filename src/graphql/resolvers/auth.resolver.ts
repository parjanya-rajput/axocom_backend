import { GraphQLError } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import bcrypt from 'bcrypt';
import { userRepository } from '../../repositories/user.repository';
import { createAuthToken, createRefreshToken } from '../../utils/jwt';
import { convertUserToView } from '../../models/user.model';
import type { GraphQLContext } from '../context';
import { requireAuth } from '../context';

const SALT_ROUNDS = 12;

export const authResolvers = {
    DateTime: DateTimeResolver,


    Query: {
        me: async (_: unknown, __: unknown, context: GraphQLContext) => {
            const user = requireAuth(context);
            const result = await userRepository.getById(user.id);
            if (result.isErr() || !result.value) return null;
            return convertUserToView(result.value);
        },
    },

    Mutation: {
        signup: async (
            _: unknown,
            { input }: { input: { email: string; password: string; name?: string | null } }
        ) => {
            const { email, password, name } = input;
            if (!email?.trim() || !password) {
                throw new GraphQLError('Email and password are required', {
                    extensions: { code: 'BAD_USER_INPUT', errorCode: 10002 },
                });
            }
            if (password.length < 8) {
                throw new GraphQLError('Password must be at least 8 characters', {
                    extensions: { code: 'BAD_USER_INPUT', errorCode: 20012 },
                });
            }
            const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
            const result = await userRepository.create({ email: email.trim().toLowerCase(), password_hash, name: name?.trim() || null });
            if (result.isErr()) {
                if (result.error.message === 'EMAIL_ALREADY_EXISTS') {
                    throw new GraphQLError('An account with this email already exists', {
                        extensions: { code: 'BAD_USER_INPUT', errorCode: 40001 },
                    });
                }
                throw new GraphQLError('Signup failed', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
            }
            const user = result.value;
            const token = createAuthToken({ id: user.id, is_admin: user.is_admin, email: user.email, name: user.name ?? undefined });
            const refresh_token = createRefreshToken({ id: user.id, is_admin: user.is_admin, email: user.email });
            return { token, refresh_token, user: convertUserToView(user) };
        },

        login: async (
            _: unknown,
            { input }: { input: { email: string; password: string } }
        ) => {
            const { email, password } = input;
            if (!email?.trim() || !password) {
                throw new GraphQLError('Email and password are required', {
                    extensions: { code: 'UNAUTHORIZED', errorCode: 20005 },
                });
            }
            const result = await userRepository.findByEmail(email.trim().toLowerCase());
            if (result.isErr()) {
                throw new GraphQLError('Login failed', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
            }
            const user = result.value;
            if (!user) {
                throw new GraphQLError('Invalid email or password', {
                    extensions: { code: 'UNAUTHORIZED', errorCode: 40004 },
                });
            }
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
                throw new GraphQLError('Invalid email or password', {
                    extensions: { code: 'UNAUTHORIZED', errorCode: 40004 },
                });
            }
            const token = createAuthToken({ id: user.id, is_admin: user.is_admin, email: user.email, name: user.name ?? undefined });
            const refresh_token = createRefreshToken({ id: user.id, is_admin: user.is_admin, email: user.email });
            return { token, refresh_token, user: convertUserToView(user) };
        },
    },
};