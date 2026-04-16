---
name: quiz
description: "Use when you need to gather structured input from the user through a series of questions — project setup, requirements gathering, configuration decisions, or any scenario where multiple choices need to be made one at a time."
---

# Quiz

Interactive questionnaire that walks the user through questions one at a time, collects answers, and presents a summary.

## How It Works

1. **Receive context** — the invoker provides topic/context for the quiz (e.g., "project setup", a document, a list of decisions to make)
2. **Generate questions** — derive questions with answer options from the given context
3. **Ask one by one** — present each question with numbered options
4. **Collect answers** — track every answer as the user provides it
5. **Summarize** — when all questions are answered, present a compact summary

## Question Format

Present each question like this:

```
**Question N of M: [question text]**

1. [option A]
2. [option B]
3. [option C]
4. Provide your own answer
5. Let's discuss this first

> Your choice:
```

## Rules

- **One question at a time.** Never batch questions.
- **Adapt on the fly.** If an earlier answer makes a later question irrelevant, skip it. If it opens a new question, add it.
- **Accept any response form.** User can pick a number, type a free-form answer, or ask to discuss. All valid.
- **Discussion mode.** If user picks "discuss" or asks a follow-up, engage fully. When resolved, record the answer and move on.
- **Track all answers internally.** After each answer, confirm what was recorded briefly (one line) and ask to proceed.
- **Allow corrections.** If the user wants to change a previous answer, update it.
- **Present summary at the end.** Short table or list — question + answer. No commentary unless asked.

## Context Sources

The quiz derives its questions from whatever context is available. Context can come from:

- **Explicit arguments** — `/quiz Set up a new microservice`
- **Conversation history** — an agent invokes the quiz after discussing a topic with the user; use the conversation so far to generate relevant questions
- **Files and codebase** — read relevant files, configs, or docs to inform questions
- **Combination** — use all available signals

If no context is available from any source, ask the user what the quiz should be about.

## After Completion

The answers remain in conversation context. The agent should use them to inform subsequent reasoning and actions — no need to re-ask.
