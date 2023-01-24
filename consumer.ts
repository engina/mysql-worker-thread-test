import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import db from './db';

const processId = process.argv[2] ?? randomUUID();

const WORK_TIMEOUT = 30;
const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 20;
const SUCCESS_RATE = 80;

async function consume() {
  console.log(`Consuming work in process ${processId}...`);
  const ids = await db.$transaction<number[]>(async (tdb) => {
    const works: { id: number; }[] = await tdb.$queryRaw`SELECT id FROM work WHERE completedAt is null and (attempts < ${MAX_ATTEMPTS}) and (startedAt is null or startedAt <= utc_timestamp - INTERVAL ${WORK_TIMEOUT} second) LIMIT ${BATCH_SIZE} FOR UPDATE SKIP LOCKED`;

    const ids = works.map((work) => work.id);
    await tdb.work.updateMany({
      where: {
        id: {
          in: ids
        },
      },
      data: {
        startedAt: new Date(),
        attempts: {
          increment: 1,
        }
      },
    });
    return ids;
  });

  if (ids.length === 0) {
    console.error(`No work to get done in process ${processId}`);
    return;
  }

  const done: number[] = [];
  const logs: Prisma.CompletedCreateManyInput[] = [];
  ids.forEach((workId) => {
    if (Math.random() < (SUCCESS_RATE / 100)) {
      logs.push({
        workId,
      });
      done.push(workId);
    }
  });
  await db.$transaction([
    db.work.updateMany({
      where: {
        id: {
          in: done,
        },
      },
      data: {
        completedAt: new Date(),
      }
    }),
    db.completed.createMany({
      data: logs,
    })
  ]);
}

async function timer() {
  try {
    await consume();
    const unfinished = await db.work.findMany({
      where: {
        completedAt: null,
      }
    });
    if (unfinished.length === 0) {
      console.log(`All work done in process ${processId}`);
      process.exit(0);
    }
    setTimeout(timer, Math.round(Math.random() * 20));
  } catch (e) {
    console.error(`Process ${processId} died.`, e);
  }
}

timer();