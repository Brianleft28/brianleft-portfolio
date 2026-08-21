# The call that got lost between pods

*How scaling a real-time system to multiple Kubernetes replicas broke it in a way that left nothing in the logs — and what fixing it taught me about horizontal scaling.*

---

I build and run VUS, a queue-calling system for a municipality: kiosks, waiting-room screens, operator stations, thermal ticket printing. It runs all day, in front of the public, and it cannot go down.

It worked fine on a single pod. Then we scaled to several replicas on Kubernetes, and calls started failing **intermittently**: an operator would call a ticket, and **some screens just wouldn't hear about it**. No error. No exception. Nothing in the logs. Which screen missed which call looked random.

## The diagnosis

Socket.IO keeps its connections **in the memory of the process**. On one pod, that's enough — every client is connected to the one instance that knows about all of them. With several pods, each one only knows the clients connected to *it*.

So when an operator called a ticket and their request landed on pod A, the event was emitted only to pod A's clients. The screens connected to pod B kept waiting for something that was never coming. And since the load balancer spreads connections around, it was pure luck which screen saw which call.

The bug wasn't in the calling logic. It was an assumption: **the code held state in memory that Kubernetes assumes pods don't have.** Kubernetes treats replicas as interchangeable. Mine weren't.

## The fix

- **Redis as a pub/sub channel between pods.** Each instance publishes its events and subscribes to everyone else's, so emitting from any pod reaches every client, no matter where they're connected.
- Connection state stops living in a single process's memory. The pods become **actually interchangeable** — the premise Kubernetes was already assuming and the code wasn't honoring.

## The second way it broke — and it's a different one

With three replicas, there's a **second** failure mode Redis doesn't fix. Before the WebSocket even exists, Socket.IO negotiates the connection over a few HTTP requests that all have to land on the **same** replica. With the balancer spreading them, the second request hits a pod that knows nothing about the first, and the connection fails on and off, with no pattern.

The by-the-book answer is to ask the network team for session affinity on the balancer. The one I took depends on nobody: **the client connects straight over WebSocket and drops the HTTP negotiation.** Before removing it, I checked that in practice it was already choosing WebSocket anyway — so that "fallback" wasn't a safety net, it was the only source of the problem.

## One more decision I stand by

If Redis is unreachable or the URL is wrong, **the API still boots** and says so in the log. Before, it didn't: a typo in an env var left all three replicas down. A dashboard missing a call gets noticed and investigated; three replicas down means there is no system. The price is that it degrades quietly — so the startup log states explicitly whether the cross-pod channel came up. That line is the only signal there is.

## The lesson

**Scaling horizontally isn't just running more replicas.** Everything that was implicitly in memory — connections, sessions, cache — has to come out first, or the system starts working "sometimes." And "sometimes" is the worst failure state there is: no error, no log, just users who don't trust it anymore.

---

*I write these up because the interesting part of engineering is rarely the happy path. More at [brianleft.com](https://brianleft.com) — it's a portfolio you navigate like a Linux terminal, with an assistant that answers from these same writeups. Backend / systems, open to remote.*
