const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { AppError } = require('../middleware/errorHandler');

router.use(protect);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Reusable helper — returns plain text from Gemini
const geminiText = async (prompt, systemInstruction) => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    ...(systemInstruction && { systemInstruction }),
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// POST /api/ai/chat — general AI assistant
router.post('/chat', [body('message').notEmpty()], validate, async (req, res, next) => {
  try {
    const { message, chatId } = req.body;

    const system = chatId
      ? 'You are NexChat AI assistant embedded in a chat app. Help with questions about conversations, summarize, or answer general queries. Be concise.'
      : 'You are NexChat AI assistant. Answer helpfully and concisely.';

    const reply = await geminiText(message, system);
    res.json({ success: true, reply });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/summarize/:chatId — summarize last 50 messages
router.post('/summarize/:chatId', async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) return next(new AppError('Chat not found', 404));

    const messages = await Message.find({
      chat: chatId,
      isDeleted: false,
      type: 'text',
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username')
      .lean();

    if (!messages.length) {
      return res.json({ success: true, summary: 'No messages to summarize yet.' });
    }

    const transcript = messages
      .reverse()
      .map((m) => `${m.sender?.username || 'Unknown'}: ${m.content}`)
      .join('\n');

    const prompt =
      `Summarize the following chat conversation in 3-5 concise bullet points. Focus on key topics and decisions.\n\n${transcript}`;

    const summary = await geminiText(prompt, 'You are a helpful assistant that summarizes conversations clearly and briefly.');
    res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/smart-replies — 3 reply suggestions for a message
router.post('/smart-replies', [body('messageId').notEmpty()], validate, async (req, res, next) => {
  try {
    const message = await Message.findById(req.body.messageId).populate('sender', 'username');
    if (!message) return next(new AppError('Message not found', 404));
    if (!message.content) return res.json({ success: true, replies: [] });

    const prompt =
      `Generate exactly 3 short smart reply suggestions (max 10 words each) for this chat message: "${message.content}"\n\nRespond with ONLY a JSON object in this exact format: {"replies": ["reply1", "reply2", "reply3"]}`;

    const raw = await geminiText(prompt);

    // Gemini may wrap the JSON in markdown code fences — strip them
    const cleaned = raw.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
    let replies = [];
    try {
      replies = JSON.parse(cleaned).replies || [];
    } catch {
      // Fallback: split by newlines if Gemini returned a list instead
      replies = raw
        .split('\n')
        .map((l) => l.replace(/^[\d\.\-\*]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 3);
    }

    res.json({ success: true, replies });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
