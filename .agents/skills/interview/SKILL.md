---
name: interview
description: "Use when you need to gather structured input from the user through a series of questions — project setup, requirements gathering, configuration decisions, or any scenario where multiple choices need to be made one at a time."
---

# Interview

Interactive questionnaire that walks the user through questions one at a time, collects answers, and presents a summary.

## How It Works

1. **Receive context** — the invoker provides topic/context for the interview (e.g., "project setup", a document, a list of decisions to make)
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

- **One question at a time** — never batch questions
- **Wait for an explicit answer** — don't record or advance until the user picks one
- **Adapt on the fly** — if an earlier answer makes a later question irrelevant, skip it; if it opens a new question, add it
- **Accept any response form** — user can pick a number, type a free-form answer, or ask to discuss
- **Discussion mode** — if user picks "discuss" or asks a follow-up, engage fully; when resolved, record the answer and move on
- **Track all answers internally** — after each answer, confirm what was recorded briefly (one line) and ask to proceed
- **Allow corrections** — if the user wants to change a previous answer, update it
- **Present summary at the end** — short table or list (question + answer), no commentary unless asked

## Context Sources

The interview derives its questions from whatever context is available. Context can come from:

- **Explicit arguments** — `/interview Set up a new microservice`
- **Conversation history** — an agent invokes the interview after discussing a topic with the user; use the conversation so far to generate relevant questions
- **Files and codebase** — read relevant files, configs, or docs to inform questions
- **Combination** — use all available signals

If no context is available from any source, ask the user what the interview should be about.

## After Completion

The answers remain in conversation context. The agent should use them to inform subsequent reasoning and actions — no need to re-ask.
