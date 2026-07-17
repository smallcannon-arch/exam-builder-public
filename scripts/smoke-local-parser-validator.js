#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.CDP_PORT || 9261);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function waitForCdp() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return res.json();
    } catch (_) {}
    await sleep(100);
  }
  throw new Error('CDP did not become ready');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const events = [];
    let seq = 0;

    ws.onopen = () => {
      resolve({
        ws,
        events,
        send(method, params = {}) {
          const id = ++seq;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((res, rej) => pending.set(id, { res, rej, method }));
        }
      });
    };
    ws.onerror = reject;
    ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.rej(new Error(`${p.method}: ${JSON.stringify(msg.error)}`));
        else p.res(msg.result);
      } else if (msg.method) {
        events.push(msg);
      }
    };
  });
}

function buildBrowserTestSource() {
  return String.raw`
(async () => {
  const C = {
    summary: '\u7cbe\u7c21\u984c\u5eab\u6458\u8981\u8868',
    answers: '\u7b54\u6848\u8207\u89e3\u6790',
    teacherCheck: '\u6559\u5e2b\u5feb\u901f\u6aa2\u6838\u8868',
    blueprint: '\u8a55\u91cf\u85cd\u5716',
    overview: '\u984c\u5eab\u7e3d\u89bd',
    goals: '\u5b78\u7fd2\u76ee\u6a19\u5c0d\u7167\u8868',
    items: '\u984c\u76ee\u6e05\u55ae',
    selected: '\u9078\u984c\u6e05\u55ae',
    reconcile: '\u7d44\u5377\u914d\u5206\u5c0d\u5e33\u8868',
    draft: '\u8a66\u984c\u5be9\u6838\u8868\u8349\u7a3f',
    gap: '\u7f3a\u53e3\u63d0\u9192',
    deviation: '\u914d\u5206\u504f\u96e2\u7d00\u9304',
    suggestion: '\u6559\u5e2b\u4fee\u6b63\u5efa\u8b70',
    forbiddenRatio: '\u914d\u5206\u8207\u6bd4\u4f8b\u6aa2\u6838',
    type: '\u985e\u578b',
    group: '\u6240\u5c6c\u984c\u7d44',
    question: '\u984c\u865f',
    score: '\u5efa\u8b70\u914d\u5206',
    unit: '\u55ae\u5143',
    itemType: '\u984c\u578b',
    difficulty: '\u96e3\u5ea6',
    cognitive: '\u8a8d\u77e5\u5c64\u6b21',
    goalId: '\u5b78\u7fd2\u76ee\u6a19\u6a19\u865f',
    groupType: '\u984c\u7d44',
    childType: '\u5b50\u984c',
    singleType: '\u55ae\u984c',
    pass: '\u901a\u904e',
    warn: '\u8b66\u793a',
    consistent: '\u984c\u7d44\u7e3d\u5206\u8207\u5b50\u984c\u52a0\u7e3d\u4e00\u81f4',
    mismatch: '\u5b50\u984c\u52a0\u7e3d\u8207\u984c\u7d44\u7e3d\u5206\u4e0d\u4e00\u81f4',
    orphan: '\u6709\u5206\u6578\u4f46\u627e\u4e0d\u5230\u984c\u7d44\u5217',
    noGroup: '\u672a\u767c\u73fe\u984c\u7d44\u984c',
    missingSummary: '\u627e\u4e0d\u5230\u300c# \u7cbe\u7c21\u984c\u5eab\u6458\u8981\u8868\u300d\u5340\u584a'
  };

  const checks = [];
  const add = (id, ok, message = '') => checks.push({ id, status: ok ? 'pass' : 'fail', message });
  const has = (text, needle) => String(text || '').includes(needle);

  const requiredFns = [
    'extractH1Section',
    'parseMarkdownTable',
    'parseScoreValue',
    'buildItemGroupValidationResult',
    'validateItemGroupScores',
    'buildBankPrompt',
    'buildCompetencyBankPrompt',
    'buildPromptBUsageSpec'
  ];
  requiredFns.forEach(name => add('FN-' + name, typeof window[name] === 'function', name + ' should exist'));

  const h1Sample = [
    '# ' + C.summary,
    '',
    '| ' + C.question + ' | ' + C.type + ' |',
    '|---|---|',
    '| Q1 | ' + C.singleType + ' |',
    '## Q1',
    'This H2 must stay inside the section.',
    '# ' + C.answers,
    'answer body'
  ].join('\n');
  const h1Section = extractH1Section(h1Sample, C.summary);
  add('H1-01', !!h1Section && h1Section.includes('## Q1'), 'summary section should include H2 content');
  add('H1-02', !!h1Section && !h1Section.includes('# ' + C.answers), 'summary section should stop at next H1');
  add('H1-03', extractH1Section(h1Sample, 'Missing') === null, 'missing H1 should return null');
  add('H1-04', extractH1Section('  # ' + C.summary + '  \nbody', C.summary) !== null, 'H1 trim should be accepted');

  const table = [
    '# ' + C.summary,
    '| ' + [C.question, C.type, C.group, C.unit, C.itemType, C.score, C.difficulty, C.cognitive, C.goalId].join(' | ') + ' |',
    '|---|---|---|---|---|---:|---|---|---|',
    '| Q1 | ' + C.singleType + ' |  | Plant | MC | 2 | Easy | Understand | 1-1 |',
    '| G1 | ' + C.groupType + ' | G1 | Adapt | Group | 10 | Mid | Apply | 2-1 |',
    '| G1-1 | ' + C.childType + ' | G1 | Adapt | MC | 4 | Mid | Understand | 2-1 |',
    '| G1-2 | ' + C.childType + ' | G1 | Adapt | Short | 6 | Hard | Infer | 2-2 |',
    '| G2 | ' + C.groupType + ' | G2 | Adapt | Group | 12 | Mid | Apply | 3-1 |',
    '| G2-1 | ' + C.childType + ' | G2 | Adapt | MC | 5 | Mid | Understand | 3-1 |',
    '| G2-2 | ' + C.childType + ' | G2 | Adapt | Short | 4 | Mid | Apply | 3-1 |',
    '| G3-1 | ' + C.childType + ' | G3 | Plant | MC | 2 | Easy | Understand | 4-1 |'
  ].join('\n');
  const parsed = parseMarkdownTable(extractH1Section(table, C.summary));
  add('MD-01', parsed.length === 8, 'standard markdown table should parse 8 rows');
  add('MD-02', parsed.some(row => row.question === 'G1' && row.type === C.groupType && row.score === 10), 'G1 group row should parse');
  add('MD-03', parseScoreValue('\uff11\uff12 \u5206') === 12, 'full-width score with unit should parse');

  const validation = buildItemGroupValidationResult(parsed);
  add('VAL-01', validation.includes('| G1 | 10 | 10 | 0 |') && validation.includes(C.pass), 'G1 should pass');
  add('VAL-02', validation.includes('| G2 | 12 | 9 | -3 |') && validation.includes(C.warn), 'G2 should warn');
  add('VAL-03', validation.includes('G3') && validation.includes('G3-1') && validation.includes(C.orphan), 'G3 orphan child should warn');

  const input = document.getElementById('aiOrganizerInput');
  input.value = 'no summary here';
  validateItemGroupScores();
  add('EC-01', S.aiOrganizerResult.includes(C.missingSummary), 'missing summary should show message');

  input.value = [
    '# ' + C.summary,
    '| ' + C.question + ' | ' + C.type + ' | ' + C.score + ' |',
    '|---|---|---:|',
    '| Q1 | ' + C.singleType + ' | 2 |'
  ].join('\n');
  validateItemGroupScores();
  add('EC-02', S.aiOrganizerResult.includes('\u7121\u6cd5\u89e3\u6790'), 'missing required column should warn');

  input.value = [
    '# ' + C.summary,
    '| ' + [C.question, C.type, C.group, C.unit, C.itemType, C.score, C.difficulty, C.cognitive, C.goalId].join(' | ') + ' |',
    '|---|---|---|---|---|---:|---|---|---|',
    '| Q1 | ' + C.singleType + ' |  | Plant | MC | 2 | Easy | Understand | 1-1 |'
  ].join('\n');
  validateItemGroupScores();
  add('EC-03', S.aiOrganizerResult.includes(C.noGroup), 'no group should show no validation needed');

  S.subject = '\u81ea\u7136';
  S.grade = '\u4e94\u5e74\u7d1a';
  S.scope = 'Smoke';
  S.difficulty = 'balanced';
  S.outputMode = 'bank';
  S.files = [];
  S.matText = 'fake material';
  S.objectives = [
    { name: 'LG-1', checked: true, weight: 50 },
    { name: 'LG-2', checked: true, weight: 50 }
  ];
  const scores = [{ name: 'MC', id: 'MC', count: 2 }];
  const promptA = buildBankPrompt(scores, true);
  const promptAComp = buildCompetencyBankPrompt(scores, true);
  const requiredPromptA = [C.blueprint, C.overview, C.goals, C.items, C.summary, C.answers, C.teacherCheck].map(x => '# ' + x);
  requiredPromptA.forEach(h => add('PA-' + h, promptA.includes(h), 'bank prompt should include ' + h));
  requiredPromptA.forEach(h => add('PAC-' + h, promptAComp.includes(h), 'competency bank prompt should include ' + h));
  add('PA-order-answers-check', promptA.indexOf('# ' + C.answers) < promptA.indexOf('# ' + C.teacherCheck), 'answers should stay before teacher check');

  const promptB = buildPromptBUsageSpec();
  [C.selected, C.reconcile, C.draft, C.gap, C.deviation, C.suggestion].map(x => '# ' + x)
    .forEach(h => add('PB-' + h, promptB.includes(h), 'Prompt B should include ' + h));
  add('PB-no-forbidden-H1', !promptB.includes('# ' + C.forbiddenRatio), 'Prompt B should not add forbidden ratio H1');
  add('PB-group-whole', promptB.includes('\u984c\u7d44\u7e3d\u5206\u8a08\u5165'), 'Prompt B should mention whole group total');
  add('PB-group-partial', promptB.includes('\u5b50\u984c\u914d\u5206\u52a0\u7e3d\u8a08\u5165'), 'Prompt B should mention partial child sum');
  add('PB-review-expand', promptB.includes('\u5c55\u958b\u5b50\u984c\u5c0d\u61c9'), 'Prompt B should mention expanded child goal mapping');

  const failed = checks.filter(check => check.status === 'fail');
  return {
    status: failed.length ? 'fail' : 'pass',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    checks
  };
})()
`;
}

async function main() {
  if (!fs.existsSync(INDEX_PATH)) fail(`Missing index.html: ${INDEX_PATH}`);
  if (!fs.existsSync(CHROME_PATH)) fail(`Missing Chrome executable: ${CHROME_PATH}`);

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-builder-smoke-'));
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    await waitForCdp();
    const target = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then(r => r.json());
    const c = await connect(target.webSocketDebuggerUrl);
    await c.send('Runtime.enable');
    await c.send('Page.enable');
    await c.send('Network.enable');
    await c.send('Log.enable');
    await c.send('Network.setCacheDisabled', { cacheDisabled: true });

    c.events.length = 0;
    await c.send('Page.navigate', { url: pathToFileURL(INDEX_PATH).href });
    const started = Date.now();
    while (!c.events.some(e => e.method === 'Page.loadEventFired') && Date.now() - started < 30000) {
      await sleep(100);
    }
    await sleep(1000);

    const evalResult = await c.send('Runtime.evaluate', {
      expression: buildBrowserTestSource(),
      returnByValue: true,
      awaitPromise: true
    });
    const result = evalResult.result.value;
    const seriousConsole = c.events
      .filter(e => ['Runtime.exceptionThrown', 'Log.entryAdded'].includes(e.method))
      .map(e => e.params)
      .filter(p => /error|exception|failed/i.test(JSON.stringify(p)) && !JSON.stringify(p).includes('favicon.ico'));
    const suspiciousNetwork = c.events
      .filter(e => e.method === 'Network.requestWillBeSent')
      .map(e => e.params.request.url)
      .filter(u => /script\.google|macros\/s|apiSecret|SHARED_SECRET|Authorization|Bearer|API key|fetch\(S\.apiUrl\)|\/tools\/|apps-script|secret|token/i.test(u));

    if (seriousConsole.length) {
      result.status = 'fail';
      result.failed += 1;
      result.checks.push({ id: 'CONSOLE-00', status: 'fail', message: JSON.stringify(seriousConsole.slice(0, 3)) });
    }
    if (suspiciousNetwork.length) {
      result.status = 'fail';
      result.failed += 1;
      result.checks.push({ id: 'NETWORK-00', status: 'fail', message: suspiciousNetwork.join(', ') });
    }

    await c.send('Page.close').catch(() => {});
    c.ws.close();

    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exit(result.status === 'pass' ? 0 : 1);
  } finally {
    if (!chrome.killed) chrome.kill('SIGKILL');
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch(error => fail(error.stack || error.message));
