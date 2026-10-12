// The 16 questions, used by the form and by the function that sends answers to
// the AI. Keep the numbering: the AI instructions refer to questions by number.

export const sections = [
  {
    title: "About you",
    questions: [
      { n: 1, text: "Where do you live, and would you rather run a business locally (in person) or online?" },
      { n: 2, text: "What jobs have you had, and what did you actually do day to day in them?" },
      { n: 3, text: "What are you good at that people ask you for help with, even if it seems minor? (Fixing things, cooking, organizing, explaining tech, etc.)" },
      { n: 4, text: "What do you enjoy doing so much that you lose track of time? Is it hands-on work, working with people, or computer work?" },
    ],
  },
  {
    title: "What you have to work with",
    questions: [
      { n: 5, text: "How many hours a week could you realistically put into a business right now?", short: true },
      { n: 6, text: "How much money could you put in to get started without it hurting your household? ($0 is a fine answer.)", short: true },
      { n: 7, text: "What tools, equipment, vehicles, space, or licenses do you already have? (A truck, a garage, a sewing machine, a CDL, a commercial kitchen, etc.)" },
      { n: 8, text: "Who do you know? Any groups, communities, or industries where people know and trust you?" },
    ],
  },
  {
    title: "How you like to work",
    questions: [
      {
        n: 9,
        text: "How much do you want to deal with people?",
        options: [
          "I enjoy face-to-face contact with customers",
          "I'm fine with phone calls or video",
          "I'd rather keep it to email, text, or messages",
          "I'd rather have as little customer contact as possible",
        ],
      },
      {
        n: 10,
        text: "How comfortable are you with computers and technology?",
        options: [
          "I mostly use my phone, and I struggle with computers",
          "I can handle email, browsing, and basic apps",
          "I'm comfortable learning new software or setting up accounts online",
          "I'm very comfortable, and could build a website or run social media",
        ],
      },
      { n: 11, text: "Would you rather work alone or with a partner or small team?", short: true },
    ],
  },
  {
    title: "What you want out of it",
    questions: [
      { n: 12, text: "How much extra money per month would make a real difference in your life?", short: true },
      { n: 13, text: "Is this a side income, or do you want it to eventually replace your job?", short: true },
      { n: 14, text: "What's something that annoys you, or that people around you complain about, that you think someone should fix?" },
    ],
  },
  {
    title: "Follow-through",
    questions: [
      { n: 15, text: "What's stopped you from starting a business before, and what would need to be different this time?" },
      {
        n: 16,
        text: "How do you feel about learning new things?",
        options: [
          "I'd rather stick with what I already know",
          "I'm willing to learn if it's quick and someone shows me",
          "I like learning and would take a short class or certification",
          "I love learning and would happily spend months building a new skill",
        ],
      },
    ],
  },
];

export const questions = sections.flatMap((section) => section.questions);

export const MAX_ANSWER = 1500;
