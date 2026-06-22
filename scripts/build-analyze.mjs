process.env.ANALYZE = '1';
import { execSync } from 'node:child_process';

execSync('astro build', { stdio: 'inherit', env: process.env });
