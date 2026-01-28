import { db } from '../database/db';
import { Candidate } from '../models/candidate.model';
import { err, ok, Result } from "neverthrow";
import createLogger from '../utils/logger';

const logger = createLogger('@candidate.repository');

// Interface for Candidate Repository