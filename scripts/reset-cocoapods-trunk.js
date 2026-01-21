#!/usr/bin/env node

/**
 * EAS build helper: make sure the CocoaPods specs repo (`trunk`)
 * is in a clean state before `pod install` runs.
 *
 * On managed builds the shared macOS builder sometimes leaves
 * a half-baked `~/.cocoapods/repos/trunk` directory behind,
 * which makes the automatic `pod repo add trunk https://cdn.cocoapods.org/`
 * step fail. We proactively remove + re-add the repo so the
 * subsequent `pod install` can proceed.
 */

const { execSync } = require('child_process');

const isMac = process.platform === 'darwin';

if (!isMac) {
  console.log('[cocoapods] Skipping repo reset (non-macOS environment).');
  process.exit(0);
}

function run(command, options = {}) {
  console.log(`[cocoapods] ${command}`);
  execSync(command, { stdio: 'inherit', ...options });
}

try {
  run('pod repo remove trunk');
} catch (error) {
  console.log('[cocoapods] No existing trunk repo to remove (safe to ignore).');
}

const mirrors = [
  {
    url: 'https://cdn.cocoapods.org/',
    description: 'CDN',
  },
  {
    url: 'https://github.com/CocoaPods/Specs.git --shallow',
    description: 'GitHub mirror',
  },
];

for (const mirror of mirrors) {
  try {
    run(`pod repo add trunk ${mirror.url}`);
    console.log(`[cocoapods] Re-added trunk repo via ${mirror.description}.`);
    process.exit(0);
  } catch (error) {
    console.log(`[cocoapods] Failed to add trunk via ${mirror.description}: ${error.message}`);
  }
}

console.log('[cocoapods] All repo add attempts failed; pod install may still retry.');

