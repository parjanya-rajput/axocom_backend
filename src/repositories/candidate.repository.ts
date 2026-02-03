import { db } from '../dataconfig/db';
import { Candidate, CANDIDATE_TABLE } from '../models/candidate.model';
import { err, ok, Result } from "neverthrow";
import createLogger from '../utils/logger';
import { ERRORS, RequestError } from '../utils/error';

const logger = createLogger('@candidate.repository');

// Repository class
class CandidateRepository {

    /**
     * Get all candidates
     */
    async getAllCandidates(): Promise<Result<Candidate[], RequestError>> {
        try {
            const [rows] = await db.execute<Candidate[]>(
                `SELECT * FROM ${CANDIDATE_TABLE} ORDER BY created_at DESC`
            );
            return ok(rows);
        } catch (error) {
            logger.error('Error fetching all candidates:', error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    /**
     * Get candidate by ID
     */
    async getById(id: number): Promise<Result<Candidate, RequestError>> {
        try {
            const [rows] = await db.execute<Candidate[]>(
                `SELECT * FROM ${CANDIDATE_TABLE} WHERE id = ?`,
                [id]
            );

            if (rows.length === 0) {
                return err(ERRORS.CANDIDATE_NOT_FOUND);
            }

            return ok(rows[0]);
        } catch (error) {
            logger.error('Error fetching candidate by id:', error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }


    // add pagination for getAll later
    // async getAllCandidates(cursor: number, limit: number): Promise<Result<Candidate[], RequestError>> {
    //     try {
    //         const [rows] = await db.query<Candidate[]>(
    //             `SELECT * FROM ${CANDIDATE_TABLE} WHERE id < ? LIMIT ?`,
    //             [cursor, limit]
    //         );
    //         return ok(rows);
    //     } catch (error) {
    //         logger.error('Error getting all candidates', error);
    //         return err(ERRORS.DATABASE_ERROR);
    //     }
    // }
}

// Export singleton instance
export const candidateRepository = new CandidateRepository();