const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

router.use(protect);

router.get('/chat/:chatId', messageController.getMessages);
router.post('/', [body('chatId').notEmpty(), body('content').optional()], validate, messageController.sendMessage);
router.patch('/:messageId', [body('content').notEmpty()], validate, messageController.editMessage);
router.delete('/:messageId', messageController.deleteMessage);
router.post('/:messageId/react', [body('emoji').notEmpty()], validate, messageController.reactToMessage);
router.post('/chat/:chatId/read', messageController.markAsRead);

module.exports = router;
