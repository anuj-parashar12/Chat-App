const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

let io;

const startReminderScheduler = () => {
  // Check every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const dueReminders = await Reminder.find({
        scheduledAt: { $lte: now },
        isTriggered: false,
        isCancelled: false,
      }).populate('user', '_id');

      for (const reminder of dueReminders) {
        reminder.isTriggered = true;
        reminder.triggeredAt = now;
        await reminder.save();

        await Notification.create({
          recipient: reminder.user._id,
          type: 'reminder',
          title: 'Reminder',
          body: reminder.title,
          data: { reminderId: reminder._id },
        });

        // Push via socket if available
        try {
          const { getIO } = require('../sockets');
          getIO().to(reminder.user._id.toString()).emit('reminder_triggered', {
            reminderId: reminder._id,
            title: reminder.title,
          });
        } catch (_) {
          // Socket might not be initialized yet
        }
      }
    } catch (err) {
      logger.error('Reminder scheduler error:', err);
    }
  });

  logger.info('Reminder scheduler started');
};

module.exports = { startReminderScheduler };
