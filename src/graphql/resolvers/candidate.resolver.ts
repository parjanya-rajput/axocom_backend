import { GraphQLError } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import GraphQLJSON from 'graphql-type-json';
import { Candidate } from '../../models/candidate.model';
import { db } from '../../database/db';
import { CANDIDATE_TABLE } from '../../models/candidate.model';
import createLogger from '../../utils/logger';

const logger = createLogger('@candidate.resolver');

// Resolver type definitions
interface CreateCandidateInput {
  neta_id: number;
  name: string;
  so_do_wo?: string | null;
  age: number;
  candidate_image?: string | null;
  assembly_constituency: string;
  party: string;
  name_enrolled_as_voter_in: string;
  self_profession?: string | null;
  spouse_profession?: string | null;
  criminal_cases?: number | null;
  assets?: number | null;
  liabilities?: number | null;
  education_category?: string | null;
  university_name?: string | null;
  pan_itr?: any;
  details_of_criminal_cases?: any;
  details_of_movable_assets?: any;
  details_of_immovable_assets?: any;
  source_of_income?: any;
  contracts?: any;
  social_profiles?: any;
}

interface UpdateCandidateInput {
  neta_id?: number | null;
  name?: string | null;
  so_do_wo?: string | null;
  age?: number | null;
  candidate_image?: string | null;
  assembly_constituency?: string | null;
  party?: string | null;
  name_enrolled_as_voter_in?: string | null;
  self_profession?: string | null;
  spouse_profession?: string | null;
  criminal_cases?: number | null;
  assets?: number | null;
  liabilities?: number | null;
  education_category?: string | null;
  university_name?: string | null;
  pan_itr?: any;
  details_of_criminal_cases?: any;
  details_of_movable_assets?: any;
  details_of_immovable_assets?: any;
  source_of_income?: any;
  contracts?: any;
  social_profiles?: any;
}

export const candidateResolvers = {
  // Scalar resolvers
  JSON: GraphQLJSON,
  DateTime: DateTimeResolver,

  Query: {
    candidate: async (_: any, { id }: { id: number }): Promise<Candidate | null> => {
      try {
        const [rows] = await db.execute<Candidate[]>(
          `SELECT * FROM ${CANDIDATE_TABLE} WHERE id = ?`,
          [id]
        );

        if (rows.length === 0) {
          return null;
        }

        return rows[0];
      } catch (error) {
        logger.error('Error fetching candidate by id:', error);
        throw new GraphQLError('Failed to fetch candidate', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    candidates: async (): Promise<Candidate[]> => {
      try {
        const [rows] = await db.execute<Candidate[]>(
          `SELECT * FROM ${CANDIDATE_TABLE} ORDER BY created_at DESC`
        );
        return rows;
      } catch (error) {
        logger.error('Error fetching all candidates:', error);
        throw new GraphQLError('Failed to fetch candidates', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },

  Mutation: {
    createCandidate: async (_: any, { input }: { input: CreateCandidateInput }): Promise<Candidate> => {
      try {
        const fields = [
          'neta_id', 'name', 'so_do_wo', 'age', 'candidate_image',
          'assembly_constituency', 'party', 'name_enrolled_as_voter_in',
          'self_profession', 'spouse_profession', 'criminal_cases',
          'assets', 'liabilities', 'education_category', 'university_name',
          'pan_itr', 'details_of_criminal_cases', 'details_of_movable_assets',
          'details_of_immovable_assets', 'source_of_income', 'contracts', 'social_profiles'
        ];

        const values = fields.map(field => {
          const value = input[field as keyof CreateCandidateInput];
          // Convert JSON fields to JSON strings for MySQL
          if (['pan_itr', 'details_of_criminal_cases', 'details_of_movable_assets',
            'details_of_immovable_assets', 'source_of_income', 'contracts', 'social_profiles'].includes(field)) {
            return value ? JSON.stringify(value) : null;
          }
          return value ?? null;
        });

        const placeholders = fields.map(() => '?').join(', ');
        const fieldNames = fields.join(', ');

        const [result] = await db.execute(
          `INSERT INTO ${CANDIDATE_TABLE} (${fieldNames}) VALUES (${placeholders})`,
          values
        ) as any;

        const [rows] = await db.execute<Candidate[]>(
          `SELECT * FROM ${CANDIDATE_TABLE} WHERE id = ?`,
          [result.insertId]
        );

        return rows[0];
      } catch (error) {
        logger.error('Error creating candidate:', error);
        throw new GraphQLError('Failed to create candidate', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    updateCandidate: async (_: any, { id, input }: { id: number; input: UpdateCandidateInput }): Promise<Candidate> => {
      try {
        const updates: string[] = [];
        const values: any[] = [];

        Object.entries(input).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            // Convert JSON fields to JSON strings for MySQL
            if (['pan_itr', 'details_of_criminal_cases', 'details_of_movable_assets',
              'details_of_immovable_assets', 'source_of_income', 'contracts', 'social_profiles'].includes(key)) {
              updates.push(`${key} = ?`);
              values.push(JSON.stringify(value));
            } else {
              updates.push(`${key} = ?`);
              values.push(value);
            }
          }
        });

        if (updates.length === 0) {
          throw new GraphQLError('No fields to update', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }

        values.push(id);

        await db.execute(
          `UPDATE ${CANDIDATE_TABLE} SET ${updates.join(', ')} WHERE id = ?`,
          values
        );

        const [rows] = await db.execute<Candidate[]>(
          `SELECT * FROM ${CANDIDATE_TABLE} WHERE id = ?`,
          [id]
        );

        if (rows.length === 0) {
          throw new GraphQLError('Candidate not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }

        return rows[0];
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        logger.error('Error updating candidate:', error);
        throw new GraphQLError('Failed to update candidate', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },

    deleteCandidate: async (_: any, { id }: { id: number }): Promise<boolean> => {
      try {
        const [result] = await db.execute(
          `DELETE FROM ${CANDIDATE_TABLE} WHERE id = ?`,
          [id]
        ) as any;

        if (result.affectedRows === 0) {
          throw new GraphQLError('Candidate not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }

        return true;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        logger.error('Error deleting candidate:', error);
        throw new GraphQLError('Failed to delete candidate', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
};

