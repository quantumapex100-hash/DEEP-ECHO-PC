const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

let anonymousBotBlockedUntil = 0;

function errorText(error) {
  return [error?.message, error?.stderr, error?.stdout].filter(Boolean).join('\n');
}

function cleanErrorMessage(error) {
  return errorText(error)
    .replace(/∩┐╜/g, "'")
    .replace(/\uFFFD/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 900);
}

function isBotChallenge(error) {
  const text = errorText(error).toLowerCase();
  return /sign in to confirm|not a bot|captcha|confirm you.?re not a bot|login required|authentication required/.test(text);
}

function isAccess403(error) {
  const text = errorText(error).toLowerCase();
  return /http error 403|forbidden|po token|requested format is not available/.test(text);
}

function isAbort(error) {
  return error?.name === 'AbortError' || /aborted|operation was aborted/i.test(error?.message || '');
}

function clientAttemptArgs(kind) {
  if (kind === 'android') return ['--extractor-args', 'youtube:player_client=android'];
  if (kind === 'embedded') return ['--extractor-args', 'youtube:player_client=default,web_embedded,-android_vr'];
  return [];
}

async function runYtDlpSmart(executable, args, options = {}) {
  const {
    maxBuffer = 20 * 1024 * 1024,
    timeout = 45000,
    signal,
    purpose = 'generic',
    browserAuth = null,
    allowFallbackClients = true
  } = options;
  if (signal?.aborted) throw Object.assign(new Error('Operation aborted'), { name: 'AbortError' });

  const attempts = [];
  const anonymousCooldown = Date.now() < anonymousBotBlockedUntil;
  if (!anonymousCooldown) attempts.push({ name: 'default', prefix: [] });
  if (allowFallbackClients) {
    attempts.push({ name: 'android', prefix: clientAttemptArgs('android') });
    attempts.push({ name: 'embedded', prefix: clientAttemptArgs('embedded') });
  }
  if (!attempts.length) attempts.push({ name: 'android', prefix: clientAttemptArgs('android') });
  if (browserAuth?.enabled && browserAuth.browser) {
    attempts.push({ name: `browser:${browserAuth.browser}`, prefix: ['--cookies-from-browser', browserAuth.browser] });
  }

  let lastError = null;
  let botSeen = false;
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    if (signal?.aborted) throw Object.assign(new Error('Operation aborted'), { name: 'AbortError' });
    try {
      const result = await execFileAsync(executable, [...attempt.prefix, ...args], {
        maxBuffer,
        windowsHide: true,
        timeout,
        signal,
        env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }
      });
      if (attempt.name !== 'default' && purpose !== 'prefetch') {
        console.log(`[yt-dlp] ${purpose} recovered via ${attempt.name}`);
      }
      return { ...result, attempt: attempt.name };
    } catch (error) {
      if (isAbort(error)) throw error;
      lastError = error;
      botSeen = botSeen || isBotChallenge(error);
      const shouldTryNext = i < attempts.length - 1 && (isBotChallenge(error) || isAccess403(error));
      if (!shouldTryNext) break;
    }
  }

  if (botSeen) anonymousBotBlockedUntil = Date.now() + 2 * 60 * 1000;
  const wrapped = new Error(cleanErrorMessage(lastError) || 'YouTube request failed.');
  wrapped.code = botSeen ? 'YOUTUBE_BOT_CHECK' : (isAccess403(lastError) ? 'YOUTUBE_ACCESS_403' : (lastError?.code || 'YTDLP_FAILED'));
  wrapped.botChallenge = botSeen;
  wrapped.original = lastError;
  throw wrapped;
}

function resetYouTubeBackoff() {
  anonymousBotBlockedUntil = 0;
}

function getYouTubeBackoffState() {
  return { anonymousBotBlockedUntil };
}

module.exports = {
  runYtDlpSmart,
  isBotChallenge,
  isAccess403,
  isAbort,
  cleanErrorMessage,
  resetYouTubeBackoff,
  getYouTubeBackoffState
};
