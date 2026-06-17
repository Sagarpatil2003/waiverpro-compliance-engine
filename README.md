# WaiverPro Compliance Engine 🚀

An automated, enterprise-grade QA testing and compliance pipeline designed to cross-examine live web applications against official PDF compliance manuals. 

The system programmatically ingests manual layout specifications, orchestrates a headless browser to bypass authentication screens, scrapes actual DOM elements, and applies advanced LLM batch analysis to generate an immediate, production-grade audit markdown report.

---

## 🏗️ Enterprise Architecture & Design Patterns

This system is engineered around the **Pipe-and-Filter Architecture Pattern**, decoupling structural data extraction from evaluation logic to ensure maximum scalability and maintainability.

### 1. The Pipe-and-Filter Pattern
Each stage (Parser, Crawler, Comparator, Reporter) operates as an isolated filter. The output of one filter serves as the immutable structural state input for the next, communicating via standardized schemas (`rules.json`, `raw_ui.json`). This ensures that the crawler tier (Playwright) or the LLM tier (Gemini) can be swapped out independently without impacting adjacent business logic.

### 2. Multi-Modal Document Stream Ingestion
To eliminate local operating system binary dependencies (such as C++ node-canvas or node-gyp bindings), the parser leverages native file buffer conversion. By encoding the PDF document into a raw inline `base64` stream, the engine offloads heavy CPU text extraction to the cloud foundation layer, keeping the local backend light and highly portable.

### 3. Context Window Engineering & Quota Protection
To protect the system against network latency, chatty I/O loops, and API rate limits (`429 Resource Exhausted`), the evaluation logic uses a single large-context window payload. Both the expected rules array and the live UI layout matrix are bundled into **exactly one atomic API execution run**, optimizing token throughput and ensuring bulletproof runtime stability.

---

## 📊 System Visualizations

### 1. Pipeline Data Flow

```mermaid
graph TD
    %% Source Nodes
    A[docs/waiverpro.pdf] -->|Base64 Inline Stream| B(Phase 1: pdfParser.js)
    TargetApp[Target Web Application] -->|Playwright Headless Auth/Crawl| C(Phase 2: extractor.js)

    %% Data Cache Stratum
    B -->|Generates Assertions| D[data/rules.json]
    C -->|Generates UI Matrix| E[data/raw_ui.json]

    %% Processing Matrix
    D --> F(Phase 3: comparator.js)
    E --> F
    
    %% AI Batch Optimization
    F -->|Single Batched Prompt Context| Gemini{Gemini Pro Cluster}
    Gemini -->|Structured Output JSON| G[data/findings.json]

    %% Reporting Output
    G --> H(Phase 4: markdownGen.js)
    H -->|Compiles Presentation| I[COMPLIANCE_REPORT.md]

    %% Styling Elements
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style TargetApp fill:#bbf,stroke:#333,stroke-width:2px
    style I fill:#bfb,stroke:#333,stroke-width:2px
