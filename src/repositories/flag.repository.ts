import { ResultSetHeader } from "mysql2";
import { err, ok, Result } from "neverthrow";
import { db } from "../dataconfig/db";
import { FLAG_TABLE, FlagRow } from "../models/flag.model";
import { ERRORS, RequestError } from "../utils/error";
import createLogger from "../utils/logger";

const logger = createLogger("@flag.repository");

class FlagRepository {
    async create(email: string, jsonData: string): Promise<Result<FlagRow, RequestError>> {
        try {
            const [result] = await db.execute<ResultSetHeader>(
                `INSERT INTO ${FLAG_TABLE} (email, data) VALUES (?, ?)`,
                [email, jsonData]
            );

            const [rows] = await db.execute<FlagRow[]>(
                `SELECT * FROM ${FLAG_TABLE} WHERE id = ?`,
                [result.insertId]
            );

            const row = rows[0];
            // MySQL JSON columns are auto-parsed to objects on SELECT;
            // re-stringify so the GraphQL String! field can serialise it.
            return ok({
                ...row,
                data: typeof row.data === "string" ? row.data : JSON.stringify(row.data),
            });
        } catch (error) {
            logger.error("Error creating flag entry:", error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    async getByEmailAndUrl(
        email: string,
        url: string
    ): Promise<Result<FlagRow[], RequestError>> {
        try {
            const [rows] = await db.execute<FlagRow[]>(
                `SELECT * FROM ${FLAG_TABLE}
                 WHERE email = ?
                   AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.url')) = ?
                 ORDER BY created_at DESC`,
                [email, url]
            );

            return ok(
                rows.map((row) => ({
                    ...row,
                    data:
                        typeof row.data === "string"
                            ? row.data
                            : JSON.stringify(row.data),
                }))
            );
        } catch (error) {
            logger.error("Error fetching flag entries by email and url:", error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }
}

export const flagRepository = new FlagRepository();
