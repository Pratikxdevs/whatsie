import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../schemas/auth';
import { createAppError, ErrorCode } from '../errors/codes';

const router = Router();

// User Registration endpoint
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, tenantName, name } = req.body;

    // Check if a user with that email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json(createAppError(ErrorCode.DB_003, 'User already exists with this email'));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create Tenant and User simultaneously within a transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          status: 'active',
          plan: 'free',
        }
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          tenantId: tenant.id,
          role: 'admin',
        }
      });

      return { tenant, user };
    });

    res.status(201).json({
      message: 'Account registered successfully',
      tenantId: result.tenant.id,
      userId: result.user.id
    });
  } catch (error) {
    logger.error({ error }, 'Auth API registration error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User Login endpoint
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || (!user.passwordHash)) {
      return res.status(401).json(createAppError(ErrorCode.AUTH_003, 'Invalid credentials'));
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json(createAppError(ErrorCode.AUTH_003, 'Invalid credentials'));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('Auth API JWT_SECRET is missing');
      return res.status(500).json(createAppError(ErrorCode.SYS_001, 'Server misconfiguration'));
    }

    // Generate access token expiring in 1 hour
    const accessToken = jwt.sign(
      {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Generate refresh token (7 days)
    const refreshTokenPlain = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshTokenPlain, 10);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken: refreshTokenPlain,
      tenantId: user.tenantId,
      userId: user.id
    });
  } catch (error) {
    logger.error({ error }, 'Auth API login error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Refresh Token endpoint
router.post('/refresh', validateBody(refreshSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json(createAppError(ErrorCode.SYS_001, 'Server misconfiguration'));
    }

    // Find all non-expired, non-revoked refresh tokens
    const storedTokens = await prisma.refreshToken.findMany({
      where: {
        expiresAt: { gt: new Date() },
        revoked: false
      },
      include: { user: true }
    });

    let matchedToken: typeof storedTokens[number] | null = null;
    for (const stored of storedTokens) {
      if (await bcrypt.compare(refreshToken, stored.tokenHash)) {
        matchedToken = stored;
        break;
      }
    }

    if (!matchedToken) {
      return res.status(401).json(createAppError(ErrorCode.AUTH_002, 'Invalid or expired refresh token'));
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: { revoked: true }
    });

    // Issue new access token (1h)
    const newAccessToken = jwt.sign(
      {
        id: matchedToken.user.id,
        tenantId: matchedToken.user.tenantId,
        role: matchedToken.user.role
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Issue new refresh token (7d)
    const newRefreshTokenPlain = crypto.randomBytes(64).toString('hex');
    const newRefreshTokenHash = await bcrypt.hash(newRefreshTokenPlain, 10);
    await prisma.refreshToken.create({
      data: {
        userId: matchedToken.userId,
        tokenHash: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenPlain
    });
  } catch (error) {
    logger.error({ error }, 'Auth API refresh error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Logout endpoint
router.post('/logout', validateBody(logoutSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const storedTokens = await prisma.refreshToken.findMany({
      where: { revoked: false }
    });

    for (const stored of storedTokens) {
      if (await bcrypt.compare(refreshToken, stored.tokenHash)) {
        await prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revoked: true }
        });
        break;
      }
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error({ error }, 'Auth API logout error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
