init:
	npx prisma db push

# Change user and password to match your local MySQL setup
clean:
	mysql -u root worker-test -e 'SET FOREIGN_KEY_CHECKS = 0; TRUNCATE `worker-test`.completed; TRUNCATE `worker-test`.`work`; SET FOREIGN_KEY_CHECKS = 1;'

produce:
	ts-node producer.ts

# Change the number of consumers to match the number of cores on your machine
consume:
	parallel --lb ts-node consumer.ts ::: 1 2 3 4 5 6 7 8 9 10 11 12