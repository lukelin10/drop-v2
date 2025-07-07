# Product Requirements Document: Synthetic Conversation Evaluation System

## Introduction/Overview

The Synthetic Conversation Evaluation System is a standalone testing framework designed to continuously improve AI coaching conversation quality in the daily reflection app. The system generates synthetic conversations using various user personas, enables manual evaluation of AI responses, and tracks quality metrics over time to identify and eliminate formulaic response patterns. This tool will run separately from the main application and help iterate on prompt improvements to create more natural, empathetic AI interactions.

**Problem Statement:** Current AI coaching responses follow predictable, formulaic patterns that feel robotic rather than genuinely empathetic. With limited real user data (7 conversations), we need a systematic way to test and improve conversation quality.

**Goal:** Create a testing and evaluation framework that generates realistic synthetic conversations, enables systematic quality assessment, and tracks improvements over time to guide prompt iteration.

## Goals

1. **Generate realistic synthetic conversations** using 5 different user personas across various emotional scenarios
2. **Enable systematic evaluation** of conversation quality across 5 key metrics
3. **Track improvement over time** by storing evaluation results and comparing prompt versions
4. **Identify formulaic patterns** through manual review and pattern detection
5. **Support rapid iteration** on prompts with quick test-evaluate-improve cycles
6. **Minimize API costs** through efficient conversation generation and caching

## User Stories

1. **As a solo founder**, I want to generate batches of synthetic conversations, so I can test AI response quality without needing real users.

2. **As an evaluator**, I want to score conversations on multiple quality dimensions, so I can identify specific areas for improvement.

3. **As a prompt engineer**, I want to compare results between different prompt versions, so I can see if my changes actually improve conversation quality.

4. **As a product owner**, I want to see trends in conversation quality over time, so I can track progress toward more natural AI interactions.

5. **As a developer**, I want the evaluation system to run independently from the main app, so I can test locally without affecting production.

6. **As a future team lead**, I want to add additional evaluators easily, so we can scale the evaluation process.

## Functional Requirements

### 1. Conversation Generation System
1. The system must generate synthetic conversations using predefined user personas (gradual_opener, emotional_dumper, intellectual_deflector, resistance_fighter, eager_student)
2. The system must support using existing questions from the main application database
3. The system must generate initial user responses that feel authentic and include specific life details
4. The system must generate 7-exchange conversations that show natural progression based on persona type
5. The system must support different prompt versions for A/B testing
6. The system must cache generated conversations to minimize API costs

### 2. Persona Management
7. The system must implement 5 distinct user personas with different conversation styles
8. The system must vary persona behavior across initial/middle/final conversation stages
9. The system must include a bank of pre-written realistic responses for common questions
10. The system must generate persona-appropriate follow-up responses to AI messages

### 3. Evaluation Interface
11. The system must provide a web-based interface for manual conversation evaluation
12. The system must display conversations in an easy-to-read format with clear user/AI distinction
13. The system must allow scoring on 5 metrics: formula_avoidance, emotional_attunement, conversation_flow, depth_facilitation, human_likeness
14. The system must include checkboxes for common formulaic patterns (mirror_probe, generic_validation, etc.)
15. The system must provide a notes field for additional observations
16. The system must support navigation between conversations in a batch

### 4. Data Storage & Persistence
17. The system must store all generated conversations with metadata (persona, prompt version, timestamp)
18. The system must store evaluation scores and patterns for each conversation
19. The system must link evaluations to specific prompt versions
20. The system must maintain evaluation history for trend analysis

### 5. Batch Management
21. The system must support creating named evaluation batches
22. The system must generate 15-20 conversations per batch (customizable)
23. The system must track batch completion status
24. The system must allow filtering conversations by persona type or question

### 6. Reporting & Analytics
25. The system must calculate average scores across all evaluation metrics
26. The system must identify most common formulaic patterns
27. The system must highlight worst-performing conversations
28. The system must show score trends across different prompt versions
29. The system must export evaluation results to CSV/JSON formats

### 7. Prompt Version Management
30. The system must support multiple prompt versions
31. The system must tag each conversation with the prompt version used
32. The system must enable side-by-side comparison of results from different prompts
33. The system must maintain a history of prompt iterations

### 8. Cost Management
34. The system must track API usage and estimated costs
35. The system must implement rate limiting to stay within budget
36. The system must reuse cached responses where appropriate
37. The system must provide cost estimates before generating large batches

## Non-Goals (Out of Scope)

1. **Automated scoring** - all evaluation will be manual for quality control
2. **Real-time collaboration** - single evaluator at a time for now
3. **Production deployment** - local/dev environment only
4. **Mobile interface** - desktop web interface only
5. **Integration with main app UI** - separate admin interface
6. **Automated prompt optimization** - manual prompt iteration only
7. **Multi-language support** - English only
8. **Real user data import** - synthetic conversations only
9. **Complex analytics dashboards** - basic reporting only
10. **AI-powered evaluation** - human evaluation only

## Design Considerations

### UI/UX Requirements
- Clean, focused interface optimized for evaluation tasks
- Side-by-side conversation and scoring panels
- Clear visual distinction between user and AI messages
- Progress indicators for batch completion
- Keyboard shortcuts for common scoring actions

### Technical Architecture
- Separate Python backend for conversation generation (can leverage Python LLM libraries)
- PostgreSQL database shared with main app (read questions, write evaluation data)
- Simple web frontend (React or vanilla JS) for evaluation interface
- RESTful API for communication between frontend and backend
- Local development server setup

## Technical Considerations

### Database Schema
```sql
-- New tables for evaluation system
CREATE TABLE evaluation_batches (
    id SERIAL PRIMARY KEY,
    batch_name VARCHAR(255) NOT NULL,
    prompt_version VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT
);

CREATE TABLE evaluation_conversations (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES evaluation_batches(id),
    question_id INTEGER REFERENCES questions(id),
    persona_type VARCHAR(50) NOT NULL,
    conversation_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evaluation_scores (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES evaluation_conversations(id),
    formula_avoidance INTEGER CHECK (formula_avoidance BETWEEN 1 AND 5),
    emotional_attunement INTEGER CHECK (emotional_attunement BETWEEN 1 AND 5),
    conversation_flow INTEGER CHECK (conversation_flow BETWEEN 1 AND 5),
    depth_facilitation INTEGER CHECK (depth_facilitation BETWEEN 1 AND 5),
    human_likeness INTEGER CHECK (human_likeness BETWEEN 1 AND 5),
    patterns_observed TEXT[],
    notes TEXT,
    evaluated_by VARCHAR(100),
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prompt_versions (
    id SERIAL PRIMARY KEY,
    version_name VARCHAR(100) NOT NULL,
    prompt_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
```

### API Structure
```
/api/evaluation/
  POST   /batches                 # Create new evaluation batch
  GET    /batches                 # List all batches
  GET    /batches/:id             # Get batch details
  
  POST   /conversations/generate  # Generate conversations for batch
  GET    /conversations/:id       # Get single conversation
  
  POST   /scores                  # Submit evaluation scores
  GET    /scores/summary/:batchId # Get batch evaluation summary
  
  GET    /prompts                 # List prompt versions
  POST   /prompts                 # Create new prompt version
```

### Technology Stack
- **Backend**: Python (FastAPI or Flask)
- **Database**: PostgreSQL (shared with main app)
- **Frontend**: React or vanilla JavaScript
- **LLM Integration**: Anthropic Claude API
- **Development**: Docker for local environment

## Success Metrics

1. **Formula Avoidance Score**: Improve from current ~1-2 to >3.5 average within 30 days
2. **Overall Quality**: All metrics averaging >4.0 within 60 days
3. **Pattern Reduction**: Formulaic patterns present in <20% of responses
4. **Evaluation Efficiency**: Complete evaluation of 20 conversations in <2 hours
5. **Cost Efficiency**: Generate and evaluate 100 conversations for <$50/month
6. **Prompt Improvement**: Measurable score increase with each prompt iteration

## Open Questions

1. **Future Scaling**: How should the system handle multiple evaluators when that becomes necessary?
2. **Automated Detection**: Should we add automated pattern detection in the future to pre-flag conversations?
3. **Integration Points**: Would it be valuable to test conversations with real user data once available?
4. **Prompt Library**: Should we maintain a library of successful prompt components for reuse?
5. **Evaluation Calibration**: How do we ensure consistency if multiple evaluators are added later?
6. **Performance Benchmarks**: What's the target conversation quality score before considering the system "good enough"?

---

**Target Audience**: Junior developers implementing the evaluation system
**Estimated Effort**: 2-3 weeks for initial implementation
**Maintenance**: Ongoing as part of continuous improvement process