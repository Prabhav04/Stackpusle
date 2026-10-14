import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { getDeveloperProfile } from '../services/github.js';
import { ValidationError, NotFoundError, UnauthenticatedError } from '../utils/errors.js';

const saveComparisonSchema = z.object({
  name: z.string().min(1, 'Comparison name is required').max(60, 'Name must be 60 characters or less').trim(),
  usernames: z
    .array(z.string().min(1).trim().toLowerCase())
    .min(2, 'Must compare at least 2 developers')
    .max(3, 'Cannot compare more than 3 developers')
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'Duplicate usernames are not allowed in a comparison',
    }),
});

/**
 * Compare 2-3 developers side-by-side
 * GET /api/compare?users=torvalds,gaearon,yyx990803
 */
export async function compareDevelopers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawUsers = req.query.users as string;
    if (!rawUsers) {
      throw new ValidationError('Query parameter "users" is required (e.g. ?users=torvalds,gaearon)');
    }

    const rawList = rawUsers
      .split(',')
      .map((u) => u.trim().toLowerCase())
      .filter(Boolean);

    // Validate GitHub username regex
    const githubUserRegex = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/;
    for (const uname of rawList) {
      if (!githubUserRegex.test(uname)) {
        throw new ValidationError(
          `Invalid GitHub username: "${uname}". Usernames must be 1-39 alphanumeric characters or non-consecutive hyphens.`
        );
      }
    }

    const uniqueSet = new Set(rawList);
    if (uniqueSet.size !== rawList.length) {
      throw new ValidationError('Duplicate usernames detected. Head-to-head comparison requires distinct developers.');
    }

    const usernames = Array.from(uniqueSet);

    if (usernames.length < 2 || usernames.length > 3) {
      throw new ValidationError('Please provide between 2 and 3 unique usernames to compare');
    }

    // Fetch all profiles concurrently
    const settled = await Promise.allSettled(
      usernames.map((u) => getDeveloperProfile(u))
    );

    const successfulProfiles: any[] = [];
    const failedUsers: { username: string; error: string; code?: string }[] = [];

    settled.forEach((result, idx) => {
      const username = usernames[idx];
      if (result.status === 'fulfilled') {
        successfulProfiles.push(result.value);
      } else {
        const err = result.reason;
        failedUsers.push({
          username,
          error: err.message || 'Failed to load developer',
          code: err.code || 'UNKNOWN_ERROR',
        });
      }
    });

    if (successfulProfiles.length < 2) {
      // If fewer than 2 could be loaded, return detailed error
      const failedSummary = failedUsers.map((f) => `${f.username}: ${f.error}`).join('; ');
      throw new ValidationError(`Could not load enough profiles to compare. ${failedSummary}`);
    }

    // Language comparison breakdown across the developers
    // Group primary languages of owned repos for each developer
    const allLanguages = new Set<string>();
    const developerLanguageCounts = successfulProfiles.map((p) => {
      const counts: Record<string, number> = {};
      const owned = p.repos.filter((r: any) => !r.isFork);
      owned.forEach((r: any) => {
        if (r.language) {
          counts[r.language] = (counts[r.language] || 0) + 1;
          allLanguages.add(r.language);
        }
      });
      return {
        username: p.developer.username,
        counts,
        totalOwned: owned.length,
      };
    });

    const languageBreakdown = Array.from(allLanguages).map((lang) => {
      const row: Record<string, any> = { language: lang };
      developerLanguageCounts.forEach((d) => {
        row[d.username] = d.counts[lang] || 0;
      });
      return row;
    });

    // Determine leaders for stat cards
    const leaders = {
      reach: successfulProfiles.reduce((max, p) => (p.signals.reach.score > max.score ? { username: p.developer.username, score: p.signals.reach.score } : max), { username: '', score: -1 }),
      impact: successfulProfiles.reduce((max, p) => (p.signals.impact.score > max.score ? { username: p.developer.username, score: p.signals.impact.score } : max), { username: '', score: -1 }),
      activity: successfulProfiles.reduce((max, p) => (p.signals.activity.score > max.score ? { username: p.developer.username, score: p.signals.activity.score } : max), { username: '', score: -1 }),
      breadth: successfulProfiles.reduce((max, p) => (p.signals.breadth.score > max.score ? { username: p.developer.username, score: p.signals.breadth.score } : max), { username: '', score: -1 }),
      followers: successfulProfiles.reduce((max, p) => (p.developer.followers > max.count ? { username: p.developer.username, count: p.developer.followers } : max), { username: '', count: -1 }),
      stars: successfulProfiles.reduce((max, p) => (p.signals.summary.totalStars > max.count ? { username: p.developer.username, count: p.signals.summary.totalStars } : max), { username: '', count: -1 }),
    };

    // Check if the current user already saved this exact set of developers
    let isSaved = false;
    let savedComparisonId: string | null = null;
    let savedComparisonName: string | null = null;

    const userId = req.session?.userId;
    if (userId) {
      try {
        const successfulIds = new Set(successfulProfiles.map((p) => p.developer.id));
        const userComparisons = await prisma.comparison.findMany({
          where: { userId },
          include: { developers: true },
        });

        for (const comp of userComparisons) {
          const compDevIds = new Set(comp.developers.map((d) => d.developerId));
          if (
            compDevIds.size === successfulIds.size &&
            [...compDevIds].every((id) => successfulIds.has(id))
          ) {
            isSaved = true;
            savedComparisonId = comp.id;
            savedComparisonName = comp.name;
            break;
          }
        }
      } catch (checkErr) {
        console.warn('Failed to check existing saved comparisons:', checkErr);
      }
    }

    res.json({
      developers: successfulProfiles,
      failedUsers,
      languageBreakdown,
      leaders,
      isSaved,
      savedComparisonId,
      savedComparisonName,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List saved comparisons for current user
 * GET /api/comparisons
 */
export async function getSavedComparisons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId;
    if (!userId) {
      throw new UnauthenticatedError();
    }

    const comparisons = await prisma.comparison.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        developers: {
          include: {
            developer: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
                followers: true,
              },
            },
          },
        },
      },
    });

    res.json({
      comparisons: comparisons.map((c) => ({
        id: c.id,
        name: c.name,
        createdAt: c.createdAt,
        developers: c.developers.map((d) => d.developer),
        usernames: c.developers.map((d) => d.developer.username),
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Save a new named comparison (prevents duplicate entries for the same developer combination)
 * POST /api/comparisons
 */
export async function saveComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId;
    if (!userId) {
      throw new UnauthenticatedError();
    }
    const { name, usernames } = saveComparisonSchema.parse(req.body);

    const cleanUsernames = Array.from(new Set(usernames.map((u) => u.trim().toLowerCase())));

    // Ensure all developers are fetched and stored in database
    const developerIds: string[] = [];
    for (const uname of cleanUsernames) {
      const devProfile = await getDeveloperProfile(uname);
      developerIds.push(devProfile.developer.id);
    }

    // Check if a comparison with the exact same developer combination already exists for this user
    const existingComparisons = await prisma.comparison.findMany({
      where: { userId },
      include: {
        developers: {
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

    const targetDevIds = new Set(developerIds);
    const alreadySaved = existingComparisons.find((c) => {
      const devIds = new Set(c.developers.map((d) => d.developerId));
      return (
        devIds.size === targetDevIds.size &&
        [...devIds].every((id) => targetDevIds.has(id))
      );
    });

    if (alreadySaved) {
      // Update existing comparison name instead of creating duplicate
      const updated = await prisma.comparison.update({
        where: { id: alreadySaved.id },
        data: { name },
        include: {
          developers: {
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

      res.status(200).json({
        comparison: {
          id: updated.id,
          name: updated.name,
          createdAt: updated.createdAt,
          usernames: updated.developers.map((d: any) => d.developer.username),
          developers: updated.developers.map((d: any) => d.developer),
        },
        message: 'Comparison updated successfully',
        isExisting: true,
      });
      return;
    }

    const comparison = await prisma.comparison.create({
      data: {
        userId,
        name,
        developers: {
          create: developerIds.map((developerId) => ({
            developerId,
          })),
        },
      },
      include: {
        developers: {
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

    res.status(201).json({
      comparison: {
        id: comparison.id,
        name: comparison.name,
        createdAt: comparison.createdAt,
        usernames: comparison.developers.map((d: any) => d.developer.username),
        developers: comparison.developers.map((d: any) => d.developer),
      },
      message: 'Comparison saved successfully',
      isExisting: false,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get a single saved comparison by ID
 * GET /api/comparisons/:id
 */
export async function getComparisonById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const comparison = await prisma.comparison.findFirst({
      where: {
        id,
        userId, // Strictly enforce owner isolation
      },
      include: {
        developers: {
          include: {
            developer: true,
          },
        },
      },
    });

    if (!comparison) {
      throw new NotFoundError('Comparison not found');
    }

    res.json({
      comparison: {
        id: comparison.id,
        name: comparison.name,
        createdAt: comparison.createdAt,
        usernames: comparison.developers.map((d) => d.developer.username),
        developers: comparison.developers.map((d) => d.developer),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a saved comparison
 * DELETE /api/comparisons/:id
 */
export async function deleteComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const comparison = await prisma.comparison.findFirst({
      where: {
        id,
        userId, // Strictly enforce owner isolation
      },
    });

    if (!comparison) {
      throw new NotFoundError('Comparison not found');
    }

    await prisma.comparison.delete({
      where: { id },
    });

    res.json({ message: 'Comparison deleted successfully' });
  } catch (err) {
    next(err);
  }
}
