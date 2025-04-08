const { Queue } = require('bullmq');
const { redisConfig } = require('../../config/radis');
const logger = require('./logger');

const clearUserJobs = async (queueName, userId, token = null) => {

  const statesToCheck = ['waiting', 'delayed'];
  const jobs = await queueName.getJobs(statesToCheck);

  let removedCount = 0;

  logger.info(`Removing job for user ${userId} as sell param changes`)
  for (const job of jobs) {
    const matchUser = job.data?.userId?.toString() === userId;

    if (matchUser ) {
      await job.remove();
      removedCount++;
    }
  }

  logger.info(`Removed ${removedCount} job for user ${userId} as sell param changes`)
//   return removedCount;
};

module.exports = clearUserJobs;
