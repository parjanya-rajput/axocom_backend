import { db } from '../dataconfig/db';
import { User, USER_TABLE } from '../models/user.model';
import { err, ok, Result } from 'neverthrow';
import createLogger from '../utils/logger';
import { ERRORS, RequestError } from '../utils/error';

const logger = createLogger('@user.repository');

class UserRepository {
    async create(data: { email: string; password_hash: string; name: string }): Promise<Result<User, RequestError>> {
        try {
            const [result] = await db.execute<import('mysql2').ResultSetHeader>(
                `INSERT INTO ${USER_TABLE} (email, password_hash, name) VALUES (?, ?, ?)`,
                [data.email, data.password_hash, data.name]
            );
            const [rows] = await db.execute<User[]>(`SELECT * FROM ${USER_TABLE} WHERE id = ?`, [result.insertId]);
            return ok(rows[0]);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes('ER_DUP_ENTRY') || msg.includes('Duplicate entry')) {
                return err(ERRORS.USER_ALREADY_EXISTS);
            }
            logger.error('Error creating user:', error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    async findByEmail(email: string): Promise<Result<User | null, RequestError>> {
        try {
            const [rows] = await db.execute<User[]>(
                `SELECT * FROM ${USER_TABLE} WHERE email = ?`,
                [email]
            );
            return ok(rows.length > 0 ? rows[0] : null);
        } catch (error) {
            logger.error('Error finding user by email:', error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }

    async getById(id: number): Promise<Result<User | null, RequestError>> {
        try {
            const [rows] = await db.execute<User[]>(`SELECT * FROM ${USER_TABLE} WHERE id = ?`, [id]);
            if (rows.length === 0) {
                return err(ERRORS.RESOURCE_NOT_FOUND);
            }
            return ok(rows[0]);
        } catch (error) {
            logger.error('Error fetching user by id:', error);
            return err(ERRORS.DATABASE_ERROR);
        }
    }
}

export const userRepository = new UserRepository();