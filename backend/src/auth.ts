import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { pool } from './db';

export interface AuthedRequest extends Request { userId?: string }

export const signSession = (userId: string) => jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const { userId } = jwt.verify(token, config.jwtSecret) as { userId: string };
    const { rowCount } = await pool.query('SELECT 1 FROM users WHERE id=$1', [userId]);
    if (!rowCount) return res.status(401).json({ error: 'Unknown user' });
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
}
