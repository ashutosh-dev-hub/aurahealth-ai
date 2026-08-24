import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { prisma } from '../config/prisma.js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  name: string;
  doctorId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as { id: string; role: string; email: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { doctorProfile: true },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid or expired session. User not found.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as 'PATIENT' | 'DOCTOR' | 'ADMIN',
      name: user.name,
      doctorId: user.doctorProfile?.id,
    };

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Session expired or invalid token.' });
  }
};

export const requireRole = (...allowedRoles: Array<'PATIENT' | 'DOCTOR' | 'ADMIN'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of [${allowedRoles.join(', ')}]. Your role is ${req.user.role}.`,
      });
      return;
    }

    next();
  };
};
