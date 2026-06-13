/**
 * OpenAI / Gemini / Ollama / Mock Service
 * Wraps AI API calls with multiple fallbacks:
 * 1. OpenAI (if OPENAI_API_KEY is set)
 * 2. Gemini (if GEMINI_API_KEY is set)
 * 3. Ollama (if OLLAMA_MODEL is set, or if Ollama is running on port 11434)
 * 4. Mock (default fallback)
 */

let openaiClient = null;

// Initialize OpenAI client only if API key is present
if (process.env.OPENAI_API_KEY) {
  try {
    const OpenAI = require('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('[AI Service] OpenAI Client initialized');
  } catch (err) {
    console.warn('[AI Service] Failed to initialize OpenAI client:', err.message);
  }
}

// Detect Ollama status
let ollamaActive = false;
let ollamaModel = process.env.OLLAMA_MODEL || 'tinyllama';

const checkOllama = async () => {
  try {
    const res = await fetch('http://127.0.0.1:11434/api/tags');
    if (res.ok) {
      const data = await res.json();
      ollamaActive = true;
      console.log('[AI Service] Ollama detected on port 11434');
      if (data.models && data.models.length > 0) {
        // Default to the first available model if none is specified
        if (!process.env.OLLAMA_MODEL) {
          ollamaModel = data.models[0].name;
          console.log(`[AI Service] Defaulting to Ollama model: ${ollamaModel}`);
        }
      }
    }
  } catch (err) {
    // Ollama not running or unreachable
  }
};

// Run Ollama detection
checkOllama();

/**
 * Generate content via OpenAI, Gemini, Ollama, or mock fallback
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Options (model, maxTokens, etc.)
 * @returns {Object} { content, model, promptTokens, completionTokens, isMock }
 */
const generateContent = async (prompt, options = {}) => {
  const maxTokens = options.maxTokens || 1500;

  // 1. Try OpenAI
  if (openaiClient) {
    try {
      const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const response = await openaiClient.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator for the EPN adaptive learning platform. Generate structured, age-appropriate educational content in valid JSON format.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      return {
        content: JSON.parse(content),
        model,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        isMock: false,
      };
    } catch (err) {
      console.error('[AI Service] OpenAI generation error:', err.message);
    }
  }

  // 2. Try Gemini API
  if (process.env.GEMINI_API_KEY) {
    try {
      const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: {
            parts: [{ text: 'You are an expert educational content creator for the EPN adaptive learning platform. Generate structured, age-appropriate educational content in valid JSON format.' }]
          },
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: maxTokens,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API status ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const content = data.candidates[0].content.parts[0].text;
      return {
        content: JSON.parse(content),
        model: geminiModel,
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        isMock: false,
      };
    } catch (err) {
      console.error('[AI Service] Gemini generation error:', err.message);
    }
  }

  // 3. Try Ollama Local API
  if (ollamaActive || process.env.OLLAMA_MODEL) {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          system: 'You are an expert educational content creator for the EPN adaptive learning platform. Generate structured, age-appropriate educational content in valid JSON format.',
          prompt: prompt,
          stream: false,
          format: 'json',
          options: {
            num_predict: maxTokens,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama status ${response.status}`);
      }

      const data = await response.json();
      return {
        content: JSON.parse(data.response),
        model: ollamaModel,
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        isMock: false,
      };
    } catch (err) {
      console.error('[AI Service] Ollama generation error:', err.message);
    }
  }

  // 4. Mock Fallback
  console.log('[AI Service] No active API keys or local models found — running in mock mode');
  return generateMockContent(prompt, options);
};

/**
 * Generate mock educational content for development/demo
 */
const generateMockContent = (prompt, options = {}) => {
  const type = options.contentType || 'quiz';
  const subject = options.subject || 'Mathematics';
  const topic = options.topic || 'General';

  const mocks = {
    quiz: {
      title: `${topic} Practice Quiz`,
      subject,
      topic,
      questions: [
        {
          id: 1,
          question: `What is the fundamental principle of ${topic}?`,
          options: ['Option A - Core concept', 'Option B - Related idea', 'Option C - Common misconception', 'Option D - Unrelated concept'],
          correct: 0,
          explanation: `The fundamental principle of ${topic} involves understanding the core concept (Option A).`,
          difficulty: 'medium',
        },
        {
          id: 2,
          question: `Which of the following best describes ${topic}?`,
          options: ['A systematic approach', 'A random process', 'An unstructured method', 'None of the above'],
          correct: 0,
          explanation: `${topic} is best described as a systematic approach to problem-solving.`,
          difficulty: 'easy',
        },
        {
          id: 3,
          question: `Apply the concept of ${topic} to solve: If x = 5, what is 2x + 3?`,
          options: ['10', '13', '8', '15'],
          correct: 1,
          explanation: '2(5) + 3 = 10 + 3 = 13',
          difficulty: 'medium',
        },
        {
          id: 4,
          question: `What is a common misconception about ${topic}?`,
          options: [
            'It only applies in simple cases',
            'It is universally applicable',
            'It requires advanced knowledge',
            'It has no practical applications',
          ],
          correct: 0,
          explanation: `A common misconception is that ${topic} only applies in simple cases, when in fact it has broad applications.`,
          difficulty: 'hard',
        },
        {
          id: 5,
          question: `Which strategy is most effective when studying ${topic}?`,
          options: ['Memorization only', 'Practice with varied examples', 'Reading without practice', 'Skipping fundamentals'],
          correct: 1,
          explanation: 'Practicing with varied examples builds deeper understanding and retention.',
          difficulty: 'easy',
        },
      ],
      estimatedTime: 15,
      totalPoints: 50,
    },
    worksheet: {
      title: `${topic} Practice Worksheet`,
      subject,
      topic,
      instructions: `Complete the following exercises on ${topic}. Show all your work for full credit.`,
      sections: [
        {
          title: 'Part A: Conceptual Understanding',
          exercises: [
            { id: 1, type: 'short_answer', question: `Define ${topic} in your own words.`, points: 5 },
            { id: 2, type: 'short_answer', question: `List three real-world applications of ${topic}.`, points: 6 },
            { id: 3, type: 'short_answer', question: `Explain the relationship between ${topic} and related concepts.`, points: 4 },
          ],
        },
        {
          title: 'Part B: Problem Solving',
          exercises: [
            { id: 4, type: 'problem', question: `Solve the following problem using ${topic}: A student scores 75, 82, and 91 on three tests. What is the average?`, answer: '82.67', points: 10 },
            { id: 5, type: 'problem', question: `Apply ${topic} to find the missing value: 3x + 7 = 22`, answer: 'x = 5', points: 10 },
          ],
        },
        {
          title: 'Part C: Critical Thinking',
          exercises: [
            { id: 6, type: 'essay', question: `How would you use ${topic} to solve a real problem in your daily life? Provide a detailed example.`, points: 15 },
          ],
        },
      ],
      totalPoints: 50,
      estimatedTime: 30,
    },
    flashcard: {
      title: `${topic} Flashcards`,
      subject,
      topic,
      cards: [
        { id: 1, front: `What is ${topic}?`, back: `${topic} is a fundamental concept in ${subject} that involves systematic problem-solving and analytical thinking.` },
        { id: 2, front: `Key formula for ${topic}`, back: `The key formula is: Result = Base × Factor + Constant (varies by specific application)` },
        { id: 3, front: `When do you use ${topic}?`, back: `Use ${topic} when you need to analyze patterns, solve structured problems, or make predictions based on data.` },
        { id: 4, front: `Common mistake in ${topic}`, back: `The most common mistake is forgetting to check your work and verify that the answer makes logical sense.` },
        { id: 5, front: `${topic} vs. related concept`, back: `Unlike related concepts, ${topic} focuses specifically on systematic analysis and structured problem-solving approaches.` },
        { id: 6, front: `Real-world example of ${topic}`, back: `A real-world example: Using ${topic} to calculate optimal study schedules, budget planning, or data analysis.` },
      ],
    },
    explanation: {
      title: `Understanding ${topic}`,
      subject,
      topic,
      sections: [
        {
          heading: 'Introduction',
          content: `${topic} is a core concept in ${subject} that forms the foundation for more advanced learning. Understanding it thoroughly will help you tackle complex problems with confidence.`,
        },
        {
          heading: 'Key Concepts',
          content: `The main ideas behind ${topic} include: (1) systematic analysis of the problem, (2) application of relevant formulas or principles, (3) verification of results, and (4) connection to real-world scenarios.`,
        },
        {
          heading: 'Step-by-Step Approach',
          content: `To master ${topic}: Step 1 - Read the problem carefully. Step 2 - Identify what is given and what is needed. Step 3 - Choose the appropriate method. Step 4 - Solve systematically. Step 5 - Check your answer.`,
        },
        {
          heading: 'Common Pitfalls',
          content: `Students often struggle with ${topic} because they rush through problems, skip verification steps, or fail to connect new concepts to prior knowledge. Take your time and build understanding gradually.`,
        },
        {
          heading: 'Practice Tips',
          content: `To improve at ${topic}: practice daily with varied problems, explain concepts to others, create visual aids, and connect the material to subjects you enjoy.`,
        },
      ],
    },
    revision_notes: {
      title: `${topic} - Revision Notes`,
      subject,
      topic,
      summary: `Quick reference guide for ${topic} in ${subject}`,
      keyPoints: [
        `${topic} is fundamental to understanding ${subject}`,
        'Always start with the basics before moving to complex problems',
        'Practice regularly to build fluency and confidence',
        'Connect new concepts to what you already know',
        'Use multiple representations (visual, numerical, verbal)',
      ],
      formulas: [
        { name: 'Basic Formula', formula: 'Result = Input × Rate + Base', usage: 'General application' },
        { name: 'Percentage', formula: 'Percentage = (Part / Whole) × 100', usage: 'Calculating proportions' },
      ],
      mnemonics: [`Remember ${topic} with: "Plan, Apply, Verify, Explain" (PAVE)`],
      examTips: [
        'Read all questions before starting',
        'Show all working for partial credit',
        'Check units and labels',
        'Review answers if time permits',
      ],
    },
    study_plan: {
      title: `Personalized Study Plan: ${topic}`,
      subject,
      topic,
      duration: '2 weeks',
      weeklyGoals: [
        {
          week: 1,
          focus: 'Foundation Building',
          tasks: [
            { day: 'Monday', activity: `Review ${topic} fundamentals`, duration: 30, resources: ['textbook chapter 1', 'flashcards'] },
            { day: 'Tuesday', activity: 'Practice basic problems', duration: 45, resources: ['worksheet set A'] },
            { day: 'Wednesday', activity: 'Watch explanatory videos', duration: 20, resources: ['video library'] },
            { day: 'Thursday', activity: 'Take practice quiz', duration: 30, resources: ['quiz bank'] },
            { day: 'Friday', activity: 'Review mistakes and revise', duration: 40, resources: ['revision notes'] },
          ],
        },
        {
          week: 2,
          focus: 'Application & Mastery',
          tasks: [
            { day: 'Monday', activity: 'Advanced problem solving', duration: 45, resources: ['worksheet set B'] },
            { day: 'Tuesday', activity: 'Peer teaching exercise', duration: 30, resources: ['study group'] },
            { day: 'Wednesday', activity: 'Mixed practice test', duration: 60, resources: ['full practice exam'] },
            { day: 'Thursday', activity: 'Identify and address weak areas', duration: 45, resources: ['targeted exercises'] },
            { day: 'Friday', activity: 'Final review and confidence building', duration: 30, resources: ['summary notes'] },
          ],
        },
      ],
      successMetrics: ['Score 80%+ on practice quizzes', 'Complete all worksheet sections', 'Explain concepts without notes'],
    },
  };

  const content = mocks[type] || mocks.quiz;

  return {
    content,
    model: 'mock-v1',
    promptTokens: 0,
    completionTokens: 0,
    isMock: true,
  };
};

// ─── EPN Support Chatbot ───────────────────────────────────────────────────────

const EPN_SUPPORT_SYSTEM_PROMPT = `You are EPN Assistant, the friendly and knowledgeable support bot for the Educational Productivity Network (EPN) platform.

EPN is an AI-powered adaptive learning platform that helps students, teachers, parents, and administrators work together to improve educational outcomes.

Key platform features you can help with:
- **Student Portal**: personalised learning plans, mastery tracking, study materials, achievements
- **Teacher Portal**: student monitoring, AI-generated content approval, analytics, audit logs
- **Parent Portal**: progress reports, achievement verification, blockchain ledger records
- **Admin Portal**: user management, AI configuration, system analytics, budget/autonomy settings
- **AI Agents**: Monitor Agent (tracks student progress), Diagnostic Agent (identifies knowledge gaps), Curriculum Planner (generates learning plans), Content Generation Agent (creates quizzes/worksheets), Orchestrator (coordinates all agents)
- **HITL Safety**: all AI-generated content and learning plans require human approval before delivery
- **Blockchain Ledger**: immutable record of achievements and key events

Guidelines:
- Be concise, warm, and helpful.
- If you don't know something specific, say so and suggest contacting support@epn.edu.
- Never make up specific user data or system details you don't know.
- Keep responses under 200 words unless a detailed explanation is genuinely needed.`;

/**
 * Generate a chat reply for the EPN support chatbot.
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @returns {Object} { reply: string, isMock: boolean }
 */
const generateChatReply = async (messages) => {
  // 1. Try OpenAI
  if (openaiClient) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: EPN_SUPPORT_SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 400,
        temperature: 0.6,
      });

      return {
        reply: response.choices[0].message.content.trim(),
        isMock: false,
      };
    } catch (err) {
      console.error('[AI Service] OpenAI chat error:', err.message);
    }
  }

  // 2. Try Gemini API
  if (process.env.GEMINI_API_KEY) {
    try {
      const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: EPN_SUPPORT_SYSTEM_PROMPT }]
          },
          generationConfig: {
            maxOutputTokens: 400,
            temperature: 0.6
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API status ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const reply = data.candidates[0].content.parts[0].text;
      return {
        reply: reply.trim(),
        isMock: false,
      };
    } catch (err) {
      console.error('[AI Service] Gemini chat error:', err.message);
    }
  }

  // 3. Try Ollama Local API
  if (ollamaActive || process.env.OLLAMA_MODEL) {
    try {
      const ollamaMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const response = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            { role: 'system', content: EPN_SUPPORT_SYSTEM_PROMPT },
            ...ollamaMessages
          ],
          stream: false,
          options: {
            num_predict: 400,
            temperature: 0.6
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama status ${response.status}`);
      }

      const data = await response.json();
      return {
        reply: data.message.content.trim(),
        isMock: false,
      };
    } catch (err) {
      console.error('[AI Service] Ollama chat error:', err.message);
    }
  }

  // 4. Mock Chatbot Fallback
  return generateMockChatReply(messages);
};

/**
 * Rule-based mock replies for development / no-API-key mode.
 * Matches keywords in the last user message and returns a canned response.
 */
const generateMockChatReply = (messages) => {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const text = (lastUserMsg?.content || '').toLowerCase();

  const rules = [
    { keywords: ['password', 'reset', 'forgot'], reply: 'To reset your password, go to **Settings → Change Password**. Enter your current password and your new password (min 8 characters). If you\'ve forgotten your password, use the "Forgot password?" link on the login page.' },
    { keywords: ['login', 'sign in', 'access'], reply: 'To log in, visit the EPN login page and enter your registered email and password. Demo accounts are available: student@epn.edu, teacher@epn.edu, parent@epn.edu, admin@epn.edu (password: Password123!).' },
    { keywords: ['learning plan', 'study plan', 'curriculum'], reply: 'Learning plans are generated by the AI Curriculum Planner based on your knowledge gaps. Teachers review and approve them before they\'re delivered to students. You can view your active plan in the Student Dashboard.' },
    { keywords: ['agent', 'ai', 'monitor', 'diagnostic', 'orchestrator'], reply: 'EPN uses 5 AI agents: **Monitor** (tracks progress), **Diagnostic** (finds knowledge gaps), **Curriculum Planner** (creates study plans), **Content Generation** (makes quizzes & worksheets), and **Orchestrator** (coordinates everything). All AI actions require human approval (HITL).' },
    { keywords: ['approval', 'approve', 'hitl', 'human'], reply: 'EPN\'s Human-in-the-Loop (HITL) system ensures teachers review and approve all AI-generated content and learning plans before students see them. You can manage approvals in the Teacher Portal under "Approvals".' },
    { keywords: ['achievement', 'badge', 'ledger', 'blockchain'], reply: 'Achievements are recorded on EPN\'s immutable blockchain ledger. Students earn badges for mastery milestones. Parents can verify records in the Parent Portal under "Verify Records".' },
    { keywords: ['grade', 'mastery', 'score', 'progress'], reply: 'Mastery scores (0–100%) reflect how well a student understands each concept. Scores above 80% indicate strong mastery; below 60% triggers the Diagnostic Agent to recommend remedial content.' },
    { keywords: ['contact', 'support', 'help', 'email'], reply: 'For additional support, email us at **support@epn.edu** or use the contact form on this Help page. Our team typically responds within 1 business day.' },
    { keywords: ['dark', 'light', 'theme', 'mode'], reply: 'You can toggle between dark and light mode using the sun/moon icon in the top header, or via **Settings → Appearance**. Your preference is saved automatically.' },
    { keywords: ['profile', 'name', 'email', 'account'], reply: 'Update your profile details (name, email) in the **Profile** page, accessible from the sidebar. You can also change your password there.' },
    { keywords: ['parent', 'child', 'children'], reply: 'Parents can monitor their child\'s progress, view achievements, and verify blockchain records in the Parent Portal. Navigate to "Progress Reports" for detailed analytics.' },
    { keywords: ['teacher', 'class', 'student'], reply: 'Teachers can view all their students, approve AI-generated content, run analytics, and generate custom learning materials in the Teacher Portal.' },
    { keywords: ['admin', 'configuration', 'settings', 'budget'], reply: 'Admins can manage users, configure AI agent autonomy levels, set budget limits, and view system-wide analytics in the Admin Portal.' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      return { reply: rule.reply, isMock: true };
    }
  }

  // Default fallback
  return {
    reply: 'Thanks for your question! I\'m EPN Assistant. I can help with learning plans, AI agents, approvals, achievements, account settings, and more. Could you give me a bit more detail about what you need help with? Or email **support@epn.edu** for personalised assistance.',
    isMock: true,
  };
};

module.exports = { generateContent, generateChatReply };
