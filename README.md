# Producer Consumer / Double Spending Problem

Producers produce work, consumers consume work.

Multiple instance of consumers should not consume the same work (double spending).

# What does this do?
Producer produces work.

Consumers are run in parallel.

Each consumer:
1. Fetches and locks `BATCH_SIZE` works¹
2. Increases `attempts`
3. Sets `startedAt` column of the work to denote the start of the work processing.
4. "Tries" to do the work, `SUCCESS_RATE`% of chance of succeeding.
5. If the work succeeds, its `completedAt` column is set to the current time and added to the `Completed` table which has a unique work id column to ensure a work is not consumed twice.
6. If no more `completedAt is null` works, exit.
7. Otherwise go back to 1.

¹ Where `attempts` < `MAX_ATTEMPTS` and `startedAt` is null or `startedAt` is older than `WORK_TIMEOUT`. Meaning, if a work is locked by a consumer, but the consumer dies, the work will be unlocked after `WORK_TIMEOUT` seconds.

So, consumers will consume `BATCH_SIZE` works at a time, and will not consume the same work twice.

Will retry to do the work again in `WORK_TIMEOUT` seconds if a consumer cannot process it in `WORK_TIMEOUT` seconds.

Will retry to do the work for `MAX_ATTEMPTS` times.

# Test
Configure .env, Makefile and source files to your liking.

Generate database schema and generate code via prisma.
```bash
make init
```

Generate 100k works.
```bash
make produce
```

Consume them in parallel (adjust as per your core count)
```bash
parallel --lb ts-node consumer.ts ::: 1 2 3 4 5 6 7 8 9 10 11 12
```

Clean the db
```bash
make clean
```

`make consume` can be interrupted and started.

Once make consumes reports no more work to be done, it can be verified via:

```bash
mysql worker-test -e 'select count(*) from `worker-test`.completed
```

You can also check how many attemps have been made at max:
```bash
mysql -u root worker-test -e 'select attempts from `worker-test`.`work` order by attempts desc limit 1;'
```
It should correlate with success rate.