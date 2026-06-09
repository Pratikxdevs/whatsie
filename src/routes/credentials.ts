import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { validateBody } from '../middleware/validate';
import { createCredentialSchema } from '../schemas/credentials';
import { createAppError, ErrorCode } from '../errors/codes';
import { encryptCredential, decryptCredential, isEncrypted } from '../utils/crypto';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/credentials
 * List current user's credentials. keyValue is masked (first 8 chars + ***).
 */
router.get('/', async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;

    const credentials = await prisma.userCredential.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const masked = credentials.map((cred) => ({
      id: cred.id,
      provider: cred.provider,
      keyName: cred.keyName,
      keyValuePreview: cred.keyValue
        ? `${cred.keyValue.slice(0, 8)}***`
        : '',
      isDefault: cred.isDefault,
      createdAt: cred.createdAt.toISOString(),
      updatedAt: cred.updatedAt.toISOString(),
    }));

    return res.json({ credentials: masked });
  } catch (err: any) {
    logger.error({ err }, 'Credentials route error listing credentials');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

/**
 * POST /api/credentials
 * Add a new credential.
 * Body: { provider, keyName, keyValue, isDefault? }
 * If isDefault: true, unset other defaults for that provider.
 */
router.post('/', validateBody(createCredentialSchema), async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const { provider, keyName, keyValue, isDefault } = req.body;

    // If marking as default, unset existing default for this provider
    if (isDefault === true) {
      await prisma.userCredential.updateMany({
        where: { userId, provider, isDefault: true },
        data: { isDefault: false },
      });
    }

    const encryptedValue = encryptCredential(keyValue);

    const credential = await prisma.userCredential.create({
      data: {
        userId,
        provider,
        keyName,
        keyValue: encryptedValue,
        isDefault: isDefault ?? false,
      },
    });

    return res.status(201).json({
      credential: {
        id: credential.id,
        provider: credential.provider,
        keyName: credential.keyName,
        keyValuePreview: `${credential.keyValue.slice(0, 8)}***`,
        isDefault: credential.isDefault,
        createdAt: credential.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    // Unique constraint violation (duplicate keyName for same user+provider)
    if (err.code === 'P2002') {
      return res.status(409).json(createAppError(ErrorCode.DB_003, 'A credential with this name already exists for this provider'));
    }
    logger.error({ err }, 'Credentials route error creating credential');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

/**
 * DELETE /api/credentials/:id
 * Delete a credential (verify ownership).
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const { id } = req.params;

    const credential = await prisma.userCredential.findFirst({
      where: { id, userId },
    });

    if (!credential) {
      return res.status(404).json(createAppError(ErrorCode.DB_005, 'Credential not found'));
    }

    await prisma.userCredential.delete({ where: { id } });

    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Credentials route error deleting credential');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

/**
 * PUT /api/credentials/:id/default
 * Set a credential as the default for its provider.
 * Unsets other defaults for that provider first.
 */
router.put('/:id/default', async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const { id } = req.params;

    const credential = await prisma.userCredential.findFirst({
      where: { id, userId },
    });

    if (!credential) {
      return res.status(404).json(createAppError(ErrorCode.DB_005, 'Credential not found'));
    }

    // Unset other defaults for this provider
    await prisma.userCredential.updateMany({
      where: { userId, provider: credential.provider, isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    const updated = await prisma.userCredential.update({
      where: { id },
      data: { isDefault: true },
    });

    return res.json({
      credential: {
        id: updated.id,
        provider: updated.provider,
        keyName: updated.keyName,
        keyValuePreview: `${updated.keyValue.slice(0, 8)}***`,
        isDefault: updated.isDefault,
      },
    });
  } catch (err: any) {
    logger.error({ err }, 'Credentials route error setting default');
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

export default router;
