import { db } from '../dataconfig/db';
import { Voter, VOTER_TABLE } from '../models/voter.model';
import { err, ok, Result } from "neverthrow";
import createLogger from '../utils/logger';
import { ERRORS, RequestError } from '../utils/error';
import { RowDataPacket } from 'mysql2';

const logger = createLogger('@voter.repository');

type VoterAgeBucketRow = RowDataPacket & {
    age_group: string;
    total: number;
};

type CountRow = RowDataPacket & { total: number };
type DistinctValueRow = RowDataPacket & { value: string };

export type VoterPaginatedFilters = {
    page: number;
    limit: number;
    search?: string | null;
    assembly_constituency?: string | null;
    parliamentary_constituency?: string | null;
    part_number_name?: string | null;
};

export type PaginatedVoterResult = {
    rows: Voter[];
    total: number;
    page: number;
    limit: number;
};

export type VoterFilterOptionsResult = {
    assembly_constituencies: string[];
    parliamentary_constituencies: string[];
};

export type VoterFilterOptionsByAssemblyResult = {
    parliamentary_constituencies: string[];
    part_number_names: string[];
};

class VoterRepository {
    /**
     * Get voter by ID
     */
    async getById(id: number): Promise<Result<Voter | null, RequestError>> {
        try {
            const [rows] = await db.execute<Voter[]>(
                `SELECT * FROM ${VOTER_TABLE} WHERE id = ?`,
                [id]
            );

            if (rows.length === 0) {
                return err(ERRORS.VOTER_NOT_FOUND);
            }

            return ok(rows[0]);
        } catch (error) {
            logger.error('Error fetching voter by id:', error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    /**
     * Get all voters
     */
    async getAll(): Promise<Result<Voter[], RequestError>> {
        try {
            const [rows] = await db.execute<Voter[]>(
                `SELECT * FROM ${VOTER_TABLE} ORDER BY created_at DESC`
            );
            return ok(rows);
        } catch (error) {
            logger.error('Error fetching all voters:', error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    async getPaginated(
        filters: VoterPaginatedFilters
    ): Promise<Result<PaginatedVoterResult, RequestError>> {
        try {
            const {
                page,
                limit,
                search,
                assembly_constituency,
                parliamentary_constituency,
                part_number_name,
            } = filters;
            const offset = (page - 1) * limit;

            const conditions: string[] = [];
            const params: (string | number)[] = [];

            if (search) {
                conditions.push(
                    `(first_name_english LIKE ? OR last_name_english LIKE ? OR epic_number LIKE ?)`
                );
                const term = `%${search}%`;
                params.push(term, term, term);
            }

            if (assembly_constituency) {
                conditions.push(`(assembly_constituency = ? OR assembly_constituency LIKE ?)`);
                params.push(assembly_constituency, `%${assembly_constituency}%`);
            }

            if (parliamentary_constituency) {
                conditions.push(`parliamentary_constituency = ?`);
                params.push(parliamentary_constituency);
            }

            if (part_number_name) {
                conditions.push(`part_number_name = ?`);
                params.push(part_number_name);
            }

            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            const [rows] = await db.execute<Voter[]>(
                `SELECT * FROM ${VOTER_TABLE} ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
                params
            );

            const [countRows] = await db.execute<CountRow[]>(
                `SELECT COUNT(*) AS total FROM ${VOTER_TABLE} ${where}`,
                params
            );

            const total = countRows[0]?.total ?? 0;

            return ok({ rows, total, page, limit });
        } catch (error) {
            logger.error('Error fetching paginated voters:', error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    /**
     * Fetch voter rows for CSV export (no pagination).
     * Note: assembly_constituency is required; parliamentary_constituency and part_number_name are optional.
     */
    async getForExport(
        assembly_constituency: string,
        parliamentary_constituency?: string | null,
        part_number_name?: string | null
    ): Promise<Result<Voter[], RequestError>> {
        try {
            if (!assembly_constituency || assembly_constituency === "ALL") {
                return err(ERRORS.INVALID_PARAMS);
            }

            const conditions: string[] = [];
            const params: (string | number)[] = [];

            conditions.push(`assembly_constituency = ?`);
            params.push(assembly_constituency);
            conditions[conditions.length - 1] = `(assembly_constituency = ? OR assembly_constituency LIKE ?)`;
            params.push(`%${assembly_constituency}%`);

            if (parliamentary_constituency && parliamentary_constituency !== "ALL") {
                conditions.push(`parliamentary_constituency = ?`);
                params.push(parliamentary_constituency);
            }
            if (part_number_name && part_number_name !== "ALL") {
                conditions.push(`part_number_name = ?`);
                params.push(part_number_name);
            }

            const where = `WHERE ${conditions.join(" AND ")}`;

            const [rows] = await db.execute<Voter[]>(
                `SELECT * FROM ${VOTER_TABLE} ${where} ORDER BY created_at DESC`,
                params
            );

            return ok(rows);
        } catch (error) {
            logger.error("Error fetching voters for export:", error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    async getFilterOptions(): Promise<Result<VoterFilterOptionsResult, RequestError>> {
        try {
            const [assemblyRows] = await db.execute<DistinctValueRow[]>(
                `
                SELECT DISTINCT assembly_constituency AS value
                FROM ${VOTER_TABLE}
                WHERE assembly_constituency IS NOT NULL AND assembly_constituency != ''
                ORDER BY assembly_constituency
                `
            );

            const [parliamentaryRows] = await db.execute<DistinctValueRow[]>(
                `
                SELECT DISTINCT parliamentary_constituency AS value
                FROM ${VOTER_TABLE}
                WHERE parliamentary_constituency IS NOT NULL AND parliamentary_constituency != ''
                ORDER BY parliamentary_constituency
                `
            );

            return ok({
                assembly_constituencies: assemblyRows.map((row) => row.value),
                parliamentary_constituencies: parliamentaryRows.map((row) => row.value),
            });
        } catch (error) {
            logger.error('Error fetching voter filter options:', error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    async getFilterOptionsByAssembly(
        assembly_constituency: string
    ): Promise<Result<VoterFilterOptionsByAssemblyResult, RequestError>> {
        try {
            const [parliamentaryRows] = await db.execute<DistinctValueRow[]>(
                `
                SELECT DISTINCT parliamentary_constituency AS value
                FROM ${VOTER_TABLE}
                WHERE (assembly_constituency = ? OR assembly_constituency LIKE ?)
                  AND parliamentary_constituency IS NOT NULL
                  AND parliamentary_constituency != ''
                ORDER BY parliamentary_constituency
                `,
                [assembly_constituency, `%${assembly_constituency}%`]
            );

            const [partRows] = await db.execute<DistinctValueRow[]>(
                `
                SELECT DISTINCT part_number_name AS value
                FROM ${VOTER_TABLE}
                WHERE (assembly_constituency = ? OR assembly_constituency LIKE ?)
                  AND part_number_name IS NOT NULL
                  AND part_number_name != ''
                ORDER BY part_number_name
                `,
                [assembly_constituency, `%${assembly_constituency}%`]
            );

            return ok({
                parliamentary_constituencies: parliamentaryRows.map((row) => row.value),
                part_number_names: partRows.map((row) => row.value),
            });
        } catch (error) {
            logger.error("Error fetching voter filter options by assembly:", error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    async getAgeBucketsByState(
        state: string
    ): Promise<Result<VoterAgeBucketRow[], RequestError>> {
        try {
            const [rows] = await db.execute<VoterAgeBucketRow[]>(
                `
                SELECT
                  CASE
                    WHEN age BETWEEN 18 AND 25 THEN '18–25'
                    WHEN age BETWEEN 26 AND 35 THEN '26–35'
                    WHEN age BETWEEN 36 AND 45 THEN '36–45'
                    WHEN age BETWEEN 46 AND 55 THEN '46–55'
                    WHEN age BETWEEN 56 AND 65 THEN '56–65'
                    ELSE '65+'
                  END AS age_group,
                  COUNT(*) AS total
                FROM ${VOTER_TABLE}
                WHERE state = ?
                GROUP BY age_group
                `,
                [state]
            );

            return ok(rows);
        } catch (error) {
            logger.error("Error fetching voter age buckets by state:", error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }
}

// Export singleton instance
export const voterRepository = new VoterRepository();
