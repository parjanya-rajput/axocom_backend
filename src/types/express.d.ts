import { TokenData } from "../utils/jwt";

declare global {
    namespace Express {
        interface Request {
            user?: TokenData;
        }
    }
}