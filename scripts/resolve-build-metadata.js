const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);

const getArgValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return fallback;
  }

  return args[index + 1] || fallback;
};

const packageFile = path.resolve(process.cwd(), getArgValue('--package-file', 'package.json'));
const outputEnv = path.resolve(process.cwd(), getArgValue('--output-env', 'build-metadata.env'));
const repoRoot = path.dirname(packageFile);

/** Read existing build-metadata.env as fallback values for when git is unavailable. */
const readExistingMetadata = () => {
  const fallback = { buildVersion: '', buildDate: '', gitSha: '', buildTime: '', buildNumber: '' };
  try {
    if (!fs.existsSync(outputEnv)) return fallback;
    const raw = fs.readFileSync(outputEnv, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const sep = trimmed.indexOf('=');
      if (sep <= 0) continue;
      const key = trimmed.slice(0, sep).trim();
      let val = trimmed.slice(sep + 1).trim();
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      }
      if (!val || val === 'unknown') continue;
      switch (key) {
        case 'IMAGE_BUILD_VERSION': fallback.buildVersion = val; break;
        case 'IMAGE_BUILD_DATE':    fallback.buildDate = val;    break;
        case 'IMAGE_GIT_SHA':       fallback.gitSha = val;       break;
        case 'IMAGE_BUILD_TIME':    fallback.buildTime = val;    break;
        case 'IMAGE_BUILD_NUMBER':  fallback.buildNumber = val;  break;
      }
    }
  } catch { /* ignore */ }
  return fallback;
};

const existing = readExistingMetadata();

const readPackageVersion = () => {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    const version = typeof packageJson.version === 'string' ? packageJson.version.trim() : '';
    return version || 'unknown';
  } catch {
    return 'unknown';
  }
};

const normalizeVersion = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === 'unknown') {
    return 'unknown';
  }

  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
};

const runGit = (gitArgs) => {
  try {
    return execFileSync('git', gitArgs, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
  } catch {
    return '';
  }
};

const utcBuildDate = process.env.BUILD_DATE && process.env.BUILD_DATE.trim()
  ? process.env.BUILD_DATE.trim()
  : new Date().toISOString();

const normalizedBuildDate = utcBuildDate;
const buildTimeFromDate = normalizedBuildDate.match(/T(\d{2}:\d{2}:\d{2})/);

const buildMetadata = {
  buildVersion: normalizeVersion(process.env.BUILD_VERSION || readPackageVersion()),
  buildDate: normalizedBuildDate,
  gitSha: String(process.env.GIT_SHA || runGit(['rev-parse', '--short=7', 'HEAD']) || existing.gitSha || 'unknown').trim().slice(0, 12) || 'unknown',
  buildTime: String(process.env.BUILD_TIME || (buildTimeFromDate ? `${buildTimeFromDate[1]} UTC` : '') || existing.buildTime || 'unknown').trim() || 'unknown',
  buildNumber: String(
    process.env.BUILD_NUMBER
      || process.env.GITHUB_RUN_NUMBER
      || process.env.CI_PIPELINE_IID
      || process.env.CI_PIPELINE_ID
      || runGit(['rev-list', '--count', 'HEAD'])
      || existing.buildNumber
      || 'unknown'
  ).trim() || 'unknown',
};

const shellEscape = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;

const output = [
  `IMAGE_BUILD_VERSION=${shellEscape(buildMetadata.buildVersion)}`,
  `IMAGE_BUILD_DATE=${shellEscape(buildMetadata.buildDate)}`,
  `IMAGE_GIT_SHA=${shellEscape(buildMetadata.gitSha)}`,
  `IMAGE_BUILD_TIME=${shellEscape(buildMetadata.buildTime)}`,
  `IMAGE_BUILD_NUMBER=${shellEscape(buildMetadata.buildNumber)}`,
  '',
].join('\n');

fs.writeFileSync(outputEnv, output, 'utf8');