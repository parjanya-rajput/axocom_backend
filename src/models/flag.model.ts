import { RowDataPacket } from "mysql2";


export const FLAG_TABLE = "flag_data";

export const CREATE_FLAG_TABLE = `
CREATE TABLE flag_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    data JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`;

export interface FlagRow extends RowDataPacket {
    id: number;
    email: string;
    data: string;
    created_at: Date;
}
