import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  Pipeline,
  PipelineError,
  STAGES,
  findToolRoot,
  isStageKey,
  listProjects,
  type PipelineSnapshot,
  type Resolution,
  type StageKey,
} from '@sdlc/core';

const HELP = `SDLC CAPM: command line

Usage: npm run sdlc -- <command> [arguments] [--project <id>] [--as "<your name>"]

GitHub Copilot writes the deliverables: in the SDLC CAPM screen, or in Copilot Chat with /sdlc-next.
This command line versions, checks, approves and exports them.

Commands
  projects                         List the projects under projects/
  status [--json]                  Show every step, its version and its checks (--json: the full state)
  answer <Q1> "<answer>"           Answer an intake question
  resolve <step> <ID> keep|remove|waive
                                   Settle a guardrail that needs a decision
  approve <step>                   Approve a draft (refused while a check blocks)
  reopen <step> ["reason"]         Reopen an approved document; later steps go stale
  prompt <step> [--revise "<comment>"] [--out]
                                   Print the full instructions for a step, for Copilot chat
  register <step>                  Register a document Copilot chat wrote into outputs/
  export                           Write the Planview/PPP deliverables (Word, Excel) and the RTM

Steps: ${Object.keys(STAGES).join(', ')}`;

interface Args {
  cmd: string;
  pos: string[];
  flags: Record<string, string | true>;
}

function parseArgs(argv: string[]): Args {
  const pos: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      pos.push(a);
      continue;
    }
    const [key, inline] = a.slice(2).split(/=(.*)/s);
    if (inline !== undefined) flags[key] = inline;
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) flags[key] = argv[++i];
    else flags[key] = true;
  }
  return { cmd: pos.shift() ?? '', pos, flags };
}

function stage(value: string | undefined): StageKey {
  if (!value || !isStageKey(value)) throw new PipelineError(`Name a step: ${Object.keys(STAGES).join(', ')}.`);
  return value;
}

async function resolveProject(toolRoot: string, flag: string | true | undefined): Promise<string> {
  const projects = await listProjects(toolRoot);
  if (typeof flag === 'string') {
    const p = projects.find((x) => x.id === flag);
    if (!p) throw new PipelineError(`No project "${flag}" under projects/.`, projects.map((x) => `Available: ${x.id}`));
    return p.dir;
  }
  if (projects.length === 1) return projects[0].dir;
  if (!projects.length) throw new PipelineError('There are no projects yet.', ['Copy projects/sample-commercial-loan to a new folder to start one.']);
  throw new PipelineError('There is more than one project. Pick one with --project <id>.', projects.map((x) => `- ${x.id}`));
}

const MARK: Record<string, string> = { pass: 'ok  ', warn: 'warn', block: 'STOP' };

function printStatus(s: PipelineSnapshot): void {
  console.log(`${s.project.name} (${s.project.type}) · template pack: ${s.project.templatePack}\n`);
  s.stages.forEach((st, i) => {
    const blocks = st.checks.filter((c) => c.level === 'block').length;
    const extra = st.status === 'review' ? (blocks ? ` · ${blocks} check(s) block approval` : ' · ready to approve') : st.approvedBy ? ` · approved by ${st.approvedBy}` : '';
    console.log(`  ${i}  ${st.title.padEnd(18)} ${st.status.padEnd(9)} ${(st.version ? `v${st.version}` : '').padEnd(6)} owner: ${st.owner}${extra}`);
  });
  const c = s.coverage;
  if (c.requirements) console.log(`\nTraceability: of ${c.requirements} BRD requirements, ${c.withDesign} have an FDD item, ${c.withTechnical} a TDD item, ${c.sitDecided} a SIT scope decision and ${c.uatDecided} a UAT scope decision; ${c.fullyTraced} are fully traced.`);
}

function printChecks(s: PipelineSnapshot, key: StageKey): void {
  const st = s.stages.find((x) => x.key === key)!;
  console.log(`\n${st.title} v${st.version}: ${st.file}`);
  for (const c of st.checks) console.log(`  [${MARK[c.level]}] ${c.message}${c.options ? `  (choose: ${c.options.join(' | ')})` : ''}`);
  for (const q of st.questions ?? []) if (!q.answer) console.log(`  ${q.id} (${q.severity}): ${q.question}${q.suggested ? `\n       suggested: ${q.suggested}` : ''}`);
}

async function main(): Promise<void> {
  const { cmd, pos, flags } = parseArgs(process.argv.slice(2));
  if (!cmd || flags.help || cmd === 'help') {
    console.log(HELP);
    return;
  }
  const toolRoot = await findToolRoot(process.cwd());
  if (!toolRoot) throw new PipelineError('Run this inside the SDLC_CAPM repo: no content/steps folder was found.');

  if (cmd === 'projects') {
    for (const p of await listProjects(toolRoot)) console.log(`${p.id}  ${p.name}`);
    return;
  }

  const projectDir = await resolveProject(toolRoot, flags.project);
  const pipeline = await Pipeline.open({
    toolRoot,
    projectDir,
    onEvent: (e) => {
      if (e.type === 'progress') console.log(`  ... ${e.message}`);
    },
  });
  const actor = { name: typeof flags.as === 'string' ? flags.as : process.env.SDLC_REVIEWER || os.userInfo().username };

  switch (cmd) {
    case 'status':
      if (flags.json) console.log(JSON.stringify(await pipeline.snapshot(), null, 2));
      else printStatus(await pipeline.snapshot());
      break;
    case 'answer':
      await pipeline.answer(pos[0] ?? '', pos.slice(1).join(' '), actor);
      printChecks(await pipeline.snapshot(), 'intake');
      break;
    case 'resolve': {
      const key = stage(pos[0]);
      const decision = pos[2] as Resolution;
      if (!['keep', 'remove', 'waive'].includes(decision)) throw new PipelineError('Choose keep, remove or waive.');
      await pipeline.resolve(key, pos[1] ?? '', decision, actor);
      printChecks(await pipeline.snapshot(), key);
      break;
    }
    case 'approve': {
      const key = stage(pos[0]);
      const next = await pipeline.approve(key, actor);
      console.log(`Approved ${STAGES[key].title} as ${actor.name} (${pipeline.project.owners[key]}).`);
      console.log(next ? `Next step: ${STAGES[next].title}.` : pipeline.order.every((k) => pipeline.status(k) === 'approved') ? 'Every step is approved. Run "export" next.' : '');
      break;
    }
    case 'reopen': {
      const key = stage(pos[0]);
      await pipeline.reopen(key, actor, pos.slice(1).join(' '));
      printStatus(await pipeline.snapshot());
      break;
    }
    case 'prompt': {
      const key = stage(pos[0]);
      const { messages, file } = await pipeline.promptFor(key, typeof flags.revise === 'string' ? flags.revise : undefined);
      const target = path.join('projects', pipeline.project.id, file).split(path.sep).join('/');
      const images = messages.flatMap((m) => m.images ?? []).map((i) => `- ${i.name}`);
      const text = [
        `# SDLC step: ${STAGES[key].title}`,
        '',
        `Write the finished document to \`${target}\`, then run \`npm run sdlc -- register ${key}\`.`,
        images.length ? `\nAlso look at these Figma images in the inputs folder:\n${images.join('\n')}` : '',
        '',
        ...messages.map((m) => `<!-- ${m.role} -->\n${m.content}`),
      ].join('\n');
      if (flags.out) {
        const out = path.join(pipeline.project.dir, 'outputs', `.prompt-${key}.md`);
        await fs.mkdir(path.dirname(out), { recursive: true });
        await fs.writeFile(out, text, 'utf8');
        console.log(`Instructions written to ${path.relative(toolRoot, out).split(path.sep).join('/')}`);
        console.log(`Write the document to ${target}`);
      } else {
        console.log(text);
      }
      break;
    }
    case 'register': {
      const key = stage(pos[0]);
      await pipeline.register(key, { name: typeof flags.as === 'string' ? flags.as : 'Copilot chat' });
      printChecks(await pipeline.snapshot(), key);
      break;
    }
    case 'export': {
      const r = await pipeline.exportAll(actor);
      console.log(`Exported ${r.files.length} files. ${r.coverage.fullyTraced} of ${r.coverage.requirements} requirements are fully traced.`);
      for (const f of r.files) console.log(`  projects/${pipeline.project.id}/${f}`);
      break;
    }
    default:
      throw new PipelineError(`Unknown command "${cmd}". Run "npm run sdlc -- help" for the list.`);
  }
}

main().catch((err) => {
  if (err instanceof PipelineError) {
    console.error(`\n${err.message}`);
    for (const d of err.details) console.error(`  - ${d}`);
  } else {
    console.error(err);
  }
  process.exitCode = 1;
});
