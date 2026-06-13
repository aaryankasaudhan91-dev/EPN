/**
 * Chat Route - EPN Support Chatbot
 * POST /api/chat
 *
 * Accepts a conversation history and returns an AI-generated reply using the
 * existing OpenAI service (with mock fallback when no API key is configured).
 */

const express = require('express');
const { generateChatReply } = require('../services/openai');

const router = express.Router();

/**
 * POST /api/chat
 * Body: { messages: Array<{ role: 'user'|'assistant', content: string }> }
 * Returns: { reply: string, isMock: boolean }
 *
 * This endpoint is intentionally public so the Help page chatbot works for
 * unauthenticated visitors too. Rate limiting is applied at the app level.
 */
router.post('/', async (req, res, next) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Validate message shape
    for (const msg of messages) {
      if (!['user', 'assistant'].includes(msg.role) || typeof msg.content !== 'string') {
        return res.status(400).json({ error: 'Each message must have role (user|assistant) and content (string)' });
      }
    }

    // Keep only the last 10 messages to avoid runaway token usage
    const trimmedMessages = messages.slice(-10);

    const result = await generateChatReply(trimmedMessages);

    res.json({
      reply: result.reply,
      isMock: result.isMock,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
