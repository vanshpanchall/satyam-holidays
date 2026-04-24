const Job = require("../models/Job");
const logger = require("./logger");

const handlers = new Map();

class QueueService {
  constructor() {
    this.intervalId = null;
    this.isProcessing = false;
  }

  // Register a handler function for a job type
  registerHandler(type, handlerFn) {
    handlers.set(type, handlerFn);
    logger.info(`[queue] Handler registered for job type: ${type}`);
  }

  // Add a new job to the database queue
  async addJob(type, data, options = {}) {
    const { nextRunAt = new Date(), maxAttempts = 3 } = options;
    try {
      const job = new Job({
        type,
        data,
        nextRunAt,
        maxAttempts,
      });
      await job.save();
      logger.debug(`[queue] Job added: ${type} (ID: ${job._id})`);
      return job;
    } catch (error) {
      logger.error(`[queue] Failed to add job: ${error.message}`);
      throw error;
    }
  }

  // Start background worker polling loop
  startProcessing() {
    if (this.intervalId) return;

    logger.info("[queue] Background worker queue processor started");
    this.intervalId = setInterval(() => this.processJobs(), 5000); // Poll every 5 seconds
    if (this.intervalId.unref) {
      this.intervalId.unref(); // Don't block event loop on exit
    }
  }

  // Stop background worker polling loop
  stopProcessing() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("[queue] Background worker queue processor stopped");
    }
  }

  // Poll and execute pending jobs
  async processJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      // Find jobs that are pending or processing (crashed lock timeout)
      const query = {
        $or: [{ status: "pending" }, { status: "processing", runLockedAt: { $lt: twoMinutesAgo } }],
        nextRunAt: { $lte: new Date() },
      };

      const jobs = await Job.find(query).limit(5);

      if (jobs.length === 0) {
        this.isProcessing = false;
        return;
      }

      await Promise.all(jobs.map((job) => this.runJob(job)));
    } catch (error) {
      logger.error(`[queue] Error in processJobs: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  // Execute a single job
  async runJob(job) {
    // Lock job using findOneAndUpdate to prevent race conditions
    const lockedJob = await Job.findOneAndUpdate(
      {
        _id: job._id,
        $or: [{ status: "pending" }, { status: "processing", runLockedAt: job.runLockedAt }],
      },
      {
        status: "processing",
        runLockedAt: new Date(),
        $inc: { attempts: 1 },
      },
      { new: true }
    );

    if (!lockedJob) return;

    const handler = handlers.get(lockedJob.type);
    if (!handler) {
      const errMessage = `No handler registered for job type: ${lockedJob.type}`;
      logger.error(`[queue] ${errMessage}`);

      lockedJob.status = "failed";
      lockedJob.errorLog = errMessage;
      await lockedJob.save();
      return;
    }

    try {
      logger.debug(
        `[queue] Executing job ${lockedJob._id} (${lockedJob.type}), attempt ${lockedJob.attempts}`
      );

      await handler(lockedJob.data);

      lockedJob.status = "completed";
      lockedJob.errorLog = null;
      await lockedJob.save();

      logger.debug(`[queue] Job completed: ${lockedJob._id}`);
    } catch (error) {
      logger.error(`[queue] Job execution failed for ${lockedJob._id}: ${error.message}`);

      lockedJob.errorLog = error.stack || error.message;

      if (lockedJob.attempts >= lockedJob.maxAttempts) {
        lockedJob.status = "failed";
        logger.warn(
          `[queue] Job ${lockedJob._id} failed permanently after ${lockedJob.attempts} attempts`
        );
      } else {
        lockedJob.status = "pending";
        const delaySeconds = Math.pow(2, lockedJob.attempts) * 30;
        lockedJob.nextRunAt = new Date(Date.now() + delaySeconds * 1000);
        logger.debug(
          `[queue] Job ${lockedJob._id} scheduled for retry at ${lockedJob.nextRunAt.toISOString()}`
        );
      }

      await lockedJob.save();
    }
  }
}

const queueService = new QueueService();

// Register default handlers
const emailUtils = require("./email");

queueService.registerHandler("send-email", async (data) => {
  const { to, template, subject, data: templateData } = data;
  await emailUtils.send({ to, template, subject, data: templateData });
});

queueService.registerHandler("send-followup", async (data) => {
  const Enquiry = require("../models/Enquiry");
  const enquiry = await Enquiry.findById(data.enquiryId);
  if (!enquiry || enquiry.status !== "pending") return;

  await emailUtils.send({
    to: enquiry.email,
    template: "enquiry-nudge",
    subject: `Still planning your trip to ${enquiry.destination.toUpperCase()}?`,
    data: { name: enquiry.name, destination: enquiry.destination },
  });

  enquiry.followUps.push({
    sentAt: new Date(),
    type: "email_nudge",
  });
  await enquiry.save();
});

module.exports = queueService;
