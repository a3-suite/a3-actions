import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDirectory, '../..');
const requiredFiles = ['action.yml', 'package.json', 'src/index.ts', 'dist/index.js'];

export const collectActions = (root) => {
  const actionsRoot = path.join(root, 'actions');
  const entries = readdirSync(actionsRoot, { withFileTypes: true });
  const actions = entries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const actionPath = path.join(actionsRoot, entry.name);
      for (const file of requiredFiles) {
        if (!existsSync(path.join(actionPath, file))) throw new Error(`Action ${entry.name} is missing ${file}`);
      }
      return {
        name: entry.name,
        path: actionPath,
        distPath: path.relative(root, path.join(actionPath, 'dist')),
      };
    });
  if (actions.length === 0) throw new Error('No Action directories were found');
  return actions;
};

export const buildPlan = (root, actions) => [
  ...actions.flatMap((action) => [
    { command: 'npm', args: ['ci', '--ignore-scripts'], cwd: action.path },
    { command: 'npm', args: ['run', 'build'], cwd: action.path },
  ]),
  {
    command: 'git',
    args: ['diff', '--exit-code', '--', ...actions.map((action) => action.distPath)],
    cwd: root,
  },
];

export const runPlan = (plan, execute = execFileSync) => {
  for (const step of plan) execute(step.command, step.args, { cwd: step.cwd, stdio: 'inherit' });
};

export const assertNoUntrackedDist = (root, actions, execute = execFileSync) => {
  const output = execute(
    'git',
    ['ls-files', '--others', '--exclude-standard', '--', ...actions.map((action) => action.distPath)],
    { cwd: root, encoding: 'utf8' },
  );
  const untracked = String(output).trim();
  if (untracked) throw new Error(`Untracked Action dist files were found:\n${untracked}`);
};

export const checkActionDist = (root = defaultRoot) => {
  const actions = collectActions(root);
  runPlan(buildPlan(root, actions));
  assertNoUntrackedDist(root, actions);
  console.log(`Action dist is synchronized (${actions.length} actions).`);
};

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) checkActionDist();
