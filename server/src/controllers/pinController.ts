import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { ValidationError, NotFoundError, UnauthenticatedError } from '../utils/errors.js';

const createPinSchema = z.object({
  repoId: z.string().min(1, 'repoId is required'),
  note: z.string().max(500, 'Note cannot exceed 500 characters').optional().nullable(),
});

const updatePinSchema = z.object({
  note: z.string().max(500, 'Note cannot exceed 500 characters').nullable(),
});

/**
 * List all pinned repos for current user
 * GET /api/pins
 */
export async function getPins(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId;

    const pins = await prisma.pin.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        repo: {
          include: {
            developer: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    res.json({
      pins: pins.map((p) => ({
        id: p.id,
        note: p.note,
        createdAt: p.createdAt,
        repo: {
          id: p.repo.id,
          githubId: p.repo.githubId.toString(),
          name: p.repo.name,
          url: p.repo.url,
          description: p.repo.description,
          stars: p.repo.stars,
          language: p.repo.language,
          isFork: p.repo.isFork,
          pushedAt: p.repo.pushedAt,
          developer: p.repo.developer,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Pin a repository with an optional note
 * POST /api/pins
 */
export async function createPin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId;
    if (!userId) {
      throw new UnauthenticatedError();
    }
    const { repoId, note } = createPinSchema.parse(req.body);

    // Verify repo exists
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      include: {
        developer: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!repo) {
      throw new NotFoundError('Repository not found to pin');
    }

    const pin = await prisma.pin.upsert({
      where: {
        userId_repoId: {
          userId,
          repoId,
        },
      },
      create: {
        userId,
        repoId,
        note: note || null,
      },
      update: {
        note: note !== undefined ? note : undefined,
      },
    });

    res.status(201).json({
      pin: {
        id: pin.id,
        note: pin.note,
        createdAt: pin.createdAt,
        repo: {
          id: repo.id,
          githubId: repo.githubId.toString(),
          name: repo.name,
          url: repo.url,
          description: repo.description,
          stars: repo.stars,
          language: repo.language,
          developer: repo.developer,
        },
      },
      message: 'Repository pinned successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Edit a pin note
 * PATCH /api/pins/:id
 */
export async function updatePin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { note } = updatePinSchema.parse(req.body);

    const existing = await prisma.pin.findFirst({
      where: {
        id,
        userId, // Strictly enforce owner isolation
      },
    });

    if (!existing) {
      throw new NotFoundError('Pin not found');
    }

    const updated = await prisma.pin.update({
      where: { id },
      data: { note },
    });

    res.json({
      pin: updated,
      message: 'Pin note updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Unpin a repository
 * DELETE /api/pins/:id
 */
export async function deletePin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const existing = await prisma.pin.findFirst({
      where: {
        id,
        userId, // Strictly enforce owner isolation
      },
    });

    if (!existing) {
      throw new NotFoundError('Pin not found');
    }

    await prisma.pin.delete({
      where: { id },
    });

    res.json({ message: 'Repository unpinned successfully' });
  } catch (err) {
    next(err);
  }
}
