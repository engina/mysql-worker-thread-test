import { randomUUID } from 'crypto';
import db from './db';

// setInterval(async () => {
// }, 10);

async function createWork(n: number) {
  console.log(`Creating ${n} works...`);
  return db.work.createMany({
    data: Array(n).fill(0).map(() => ({
      title: `Work ${randomUUID()}`,
    }))
  }).finally(() => console.log(`Created ${n} works`));
}

createWork(100000);
