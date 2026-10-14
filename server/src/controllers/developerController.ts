import { Request, Response, NextFunction } from 'express';
import { getDeveloperProfile } from '../services/github.js';
import { prisma } from '../config/prisma.js';

export async function getDeveloper(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    const result = await getDeveloperProfile(username, { forceRefresh });

    // Side effect: Record recent view if user is logged in
    const userId = req.session?.userId;
    if (userId && result.developer.id) {
      prisma.recentView
        .upsert({
          where: {
            userId_developerId: {
              userId,
              developerId: result.developer.id,
            },
          },
          create: {
            userId,
            developerId: result.developer.id,
            viewedAt: new Date(),
          },
          update: {
            viewedAt: new Date(),
          },
        })
        .catch((err) => {
          console.warn('Failed to record recent view:', err.message);
        });
    }

    // Include pinned repos for the current user
    let userPins: { repoId: string; note: string | null; id: string }[] = [];
    if (userId) {
      try {
        userPins = await prisma.pin.findMany({
          where: { userId },
          select: { id: true, repoId: true, note: true },
        });
      } catch (err) {
        console.warn('Failed to fetch user pins:', err);
      }
    }

    const pinnedRepoMap = new Map(userPins.map((p) => [p.repoId, p]));

    const reposWithPinState = result.repos.map((r) => {
      const pin = pinnedRepoMap.get(r.id);
      return {
        ...r,
        isPinned: !!pin,
        pinId: pin?.id || null,
        pinNote: pin?.note || null,
      };
    });

    res.json({
      developer: result.developer,
      repos: reposWithPinState,
      signals: result.signals,
      stale: result.stale,
      staleReason: result.staleReason,
      cached: result.cached,
    });
  } catch (err) {
    next(err);
  }
}

export async function getRecentViews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      res.json({ recentViews: [] });
      return;
    }

    const views = await prisma.recentView.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: 8,
      include: {
        developer: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
            bio: true,
            followers: true,
            publicRepos: true,
          },
        },
      },
    });

    res.json({
      recentViews: views.map((v) => ({
        developer: v.developer,
        viewedAt: v.viewedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}
