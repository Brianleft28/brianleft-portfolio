# Everyone builds a RAG chatbot with LangChain. I wrote the pipeline by hand — and deployed it.

*The "personal AI that knows my projects" is a whole genre now. Here's the version I built, and the two choices that took it somewhere different.*

---

The standard recipe is everywhere: LangChain, a vector database, a local model, and you've got an AI that answers questions about your docs. I built one too. But I made two decisions that changed what it is.

## 1. I wrote every step by hand — no framework

Not because frameworks are bad. Because I learn a system by building it, and I wanted to **own the failure modes**. So ingestion, keyword extraction, relevance retrieval, context assembly and streaming are each written in TypeScript, inside the same app — code I can debug, test and explain line by line.

The trade-off I'd defend: **my index is hand-curated keywords, not opaque embeddings.** Less magic, more control. The payoff shows up when the assistant answers *wrong* about a project — I fix it by **editing data** (a keyword), not by re-embedding or retraining anything. The retrieval index is editable content.

## 2. It's not a chatbot — it's a parametrizable system, and it's live

The part I care about most: **everything the assistant knows, and everything the site shows, is data — not code.** An admin panel governs three layers:

- **Content:** projects load as Markdown, sync into a virtual filesystem, and each carries the keywords that drive retrieval.
- **Languages:** the whole thing exists in Spanish and English, resolved per visitor, without writing content twice.
- **Behavior:** the assistant's personalities — voice, language, greeting, prompt — are rows in a database.

A change in content, language or the assistant's tone ships **as data, not a deploy**. It's white-label by design.

And it's **self-hosted end to end** — VPS, nginx, TLS, CI/CD. Which means the thing most of these projects can't offer: **you can actually go use it.** It's not a screenshot of my local setup. It's live.

## What building it by hand actually taught me

Writing the pipeline myself didn't make it more "advanced." It made it **mine** — I can explain and debug every line, and I understand exactly what a framework would have been doing for me. Deploying it turned a demo into something people can touch.

That, to me, is the difference between "I followed a RAG tutorial" and "I built and run a system."

---

*It's the front end of my portfolio — you navigate it like a Linux terminal and ask an assistant anything about my work. Go break it: **[brianleft.com](https://brianleft.com)**. Backend / systems engineer, open to remote.*
