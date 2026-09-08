import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();
const repoRoot = join(__dirname, '..', '..', '..');

router.get('/commit', (_req: Request, res: Response) => {
    try {
        const sha = execSync('git rev-parse --short HEAD', { cwd: repoRoot })
            .toString()
            .trim();
        res.json({ sha });
    } catch (err) {
        console.error('❌ Failed to read local git commit:', err);
        res.status(500).json({ message: 'Failed to read commit info' });
    }
});

router.get('/release', (_req: Request, res: Response) => {
    try {
        const version = readFileSync(join(repoRoot, 'VERSION'), 'utf-8').trim();
        res.json({ tag_name: `v${version}` });
    } catch (err) {
        console.error('❌ Failed to read VERSION file:', err);
        res.json({ tag_name: null });
    }
});

export default router;

