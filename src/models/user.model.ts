import { RowDataPacket } from "mysql2";

export const CREATE_USER_TABLE = `
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    default_assembly_constituency VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
)
`;

export const USER_TABLE = "users";

export interface User extends RowDataPacket {
    id: number;
    email: string;
    password_hash: string;
    name: string;
    is_admin: boolean;
    default_assembly_constituency: string;
    created_at: Date;
    updated_at: Date;
}

export interface UserView {
    id: number;
    email: string;
    name: string;
    default_assembly_constituency: string;
    created_at: Date;
    updated_at: Date;
}

export function convertUserToView(user: User): UserView {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        default_assembly_constituency: user.default_assembly_constituency,
        created_at: user.created_at,
        updated_at: user.updated_at,
    };
}