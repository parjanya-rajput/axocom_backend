import { db } from '../dataconfig/db';
import { err, ok, Result } from "neverthrow";
import createLogger from '../utils/logger';
import { ERRORS, RequestError } from '../utils/error';
import { Election, ELECTION_TABLE } from '../models/election.model';


const logger = createLogger('@election.repository');

// Repository class
class ElectionRepository {
    /**
     * Get election by ID
     */
    async getById(id: number): Promise<Result<Election | null, RequestError>> {
        try {
            const [rows] = await db.execute<Election[]>(
                `SELECT * FROM ${ELECTION_TABLE} WHERE id = ?`,
                [id]
            );

            if (rows.length === 0) {
                return err(ERRORS.ELECTION_NOT_FOUND);
            }

            return ok(rows[0]);
        } catch (error) {
            logger.error('Error fetching election by id:', error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    /**
     * Get all elections
     */
    async getAll(): Promise<Result<Election[], RequestError>> {
        try {
            const [rows] = await db.execute<Election[]>(
                `SELECT * FROM ${ELECTION_TABLE} ORDER BY created_at DESC`
            );
            return ok(rows);
        } catch (error) {
            logger.error('Error fetching all elections:', error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    // add pagination for getAll later
}

// Export singleton instance
export const electionRepository = new ElectionRepository();