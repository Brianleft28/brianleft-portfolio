## 🏛️ System Architecture

```mermaid
flowchart TB
    subgraph Client ["🖥️ CLIENT (Browser)"]
        UI[/"File Explorer"/]
        Terminal["Terminal.svelte"]
        Markdown["Renderer<br/>marked + highlight.js"]
    end

    subgraph Server ["⚙️ SERVER (SvelteKit + Node.js)"]
        SSR["SSR + Hidratación"]
        API["/api/chat"]
        Memory["Memory System<br/>📁 memory/*.md"]
    end

    subgraph External ["☁️ EXTERNAL SERVICES"]
        Gemini["Google Gemini API<br/>gemini-2.5-flash"]
    end

    UI --> SSR
    Terminal -->|"POST (streaming)"| API
    API -->|"Dynamic Load"| Memory
    API -->|"Prompt + Context"| Gemini
    Gemini -->|"ReadableStream"| API
    API -->|"Text Chunks"| Terminal
    Terminal --> Markdown

    style Cliente fill:#1a1a2e,stroke:#00bc8c,color:#fff
    style Server fill:#16213e,stroke:#3498db,color:#fff
    style External fill:#0f3460,stroke:#e94560,color:#fff
    style Terminal fill:#00bc8c,stroke:#fff,color:#000
    style API fill:#3498db,stroke:#fff,color:#000
    style Gemini fill:#e94560,stroke:#fff,color:#000
```

### Data Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant T as 🖥️ Terminal
    participant A as ⚙️ /api/chat
    participant M as 📁 Memory
    participant G as 🤖 Gemini

    U->>T: Types question
    T->>A: POST { prompt }
    A->>A: Rate limit check (10/min)
    A->>M: Detects keywords in prompt
    
    alt Project list
        M-->>A: Returns summaries (optimized)
    else Specific project
        M-->>A: Loads full file
    else General question
        M-->>A: index.md + memory.md
    end
    
    A->>G: System Prompt + Context + User Prompt

    loop Streaming
        G-->>A: Text chunk
        A-->>T: ReadableStream
        T-->>U: Renders Markdown in real-time
    end
```

### Modular Memory System

```mermaid
flowchart TB
    subgraph Memory ["📁 src/lib/data/memory/"]
        index["index.md<br/>Professional Profile"]
        memory["memory.md<br/>Knowledge Base"]
        meta["meta.md<br/>Self-awareness"]
        projects["projects/*.md<br/>Project Docs"]
    end
    
    subgraph API ["⚙️ /api/chat"]
        keywords["Keyword Detector"]
        loader["Dynamic Loader"]
    end
    
    prompt["User Prompt"] --> keywords
    keywords -->|"all projects"| loader
    keywords -->|"print server"| loader
    keywords -->|"architecture"| loader
    
    loader -->|"Summaries"| projects
    loader -->|"Full File"| projects
    loader -->|"Meta"| meta
    loader -->|"Base"| index
    loader -->|"Base"| memory
    
    style Memory fill:#1a1a2e,stroke:#00bc8c,color:#fff
    style API fill:#16213e,stroke:#3498db,color:#fff
