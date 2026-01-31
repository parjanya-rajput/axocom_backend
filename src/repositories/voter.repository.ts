import { db } from '../dataconfig/db';
import { Voter, VOTER_TABLE } from '../models/voter.model';
import { err, ok, Result } from "neverthrow";
import createLogger from '../utils/logger';

const logger = createLogger('@voter.repository');

// Repository class
class VoterRepository {
    /**
     * Get voter by ID
     */
    async getById(id: number): Promise<Result<Voter | null, Error>> {
        try {
            const [rows] = await db.execute<Voter[]>(
                `SELECT * FROM ${VOTER_TABLE} WHERE id = ?`,
                [id]
            );

            if (rows.length === 0) {
                return ok(null);
            }

            return ok(rows[0]);
        } catch (error) {
            logger.error('Error fetching voter by id:', error);
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Get all voters
     */
    async getAll(): Promise<Result<Voter[], Error>> {
        try {
            const [rows] = await db.execute<Voter[]>(
                `SELECT * FROM ${VOTER_TABLE} ORDER BY created_at DESC`
            );
            return ok(rows);
        } catch (error) {
            logger.error('Error fetching all voters:', error);
            return err(error instanceof Error ? error : new Error(String(error)));
        }
    }

    // add pagination for getAll later
}

// Export singleton instance
export const voterRepository = new VoterRepository();