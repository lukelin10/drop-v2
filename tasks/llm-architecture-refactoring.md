# LLM Architecture Refactoring: Shared Infrastructure Design

## Overview

This document outlines the refactoring of our current LLM services architecture from duplicate services (`anthropic.ts` and `analysisLLM.ts`) to a shared infrastructure pattern with specialized domain services.

## Current State Analysis

### Current Architecture Problems
- **Code Duplication**: Anthropic client setup, error handling, and configuration repeated across services
- **Configuration Fragmentation**: API keys, timeouts, models scattered across multiple files
- **Resource Inefficiency**: Multiple Anthropic client instances and separate rate limiting
- **Maintenance Complexity**: Changes to LLM integration require updates in multiple places
- **Inconsistent Patterns**: Different error handling and logging approaches

### Current Files
```
server/services/
├── anthropic.ts          # Chat responses for drop conversations
└── analysisLLM.ts        # Analysis generation for drop collections
```

## Target Architecture

### Proposed Structure
```
server/services/
├── llm/
│   ├── LLMClient.ts      # Shared infrastructure & API communication
│   ├── types.ts          # Shared types and interfaces
│   └── config.ts         # Centralized LLM configuration
├── chat/
│   ├── ChatService.ts    # Domain logic for conversations
│   └── types.ts          # Chat-specific types
└── analysis/
    ├── AnalysisService.ts # Domain logic for analysis generation
    └── types.ts          # Analysis-specific types
```

### Architecture Principles
1. **Single Responsibility**: Each service handles one domain
2. **DRY**: Shared infrastructure eliminates duplication
3. **Separation of Concerns**: Technical vs. business logic separation
4. **Dependency Inversion**: Services depend on abstractions
5. **Open/Closed**: Easy to extend with new LLM use cases

## Detailed Design

### 1. Shared LLM Infrastructure

#### LLMClient.ts
```typescript
export class LLMClient {
  private client: Anthropic
  private rateLimiter: RateLimiter
  private metrics: RequestMetrics
  
  // Core API communication
  async request(prompt: string, config: LLMConfig): Promise<string>
  
  // Shared utilities
  private executeWithRetry<T>(fn: () => Promise<T>): Promise<T>
  private enforceRateLimit(): Promise<void>
  private extractTextContent(response: any): string
  private logRequest(prompt: string, config: LLMConfig, duration: number): void
  private handleError(error: Error, context: RequestContext): void
}

export interface LLMConfig {
  model: string
  maxTokens: number
  temperature: number
  timeout?: number
  retryConfig?: RetryConfig
  customHeaders?: Record<string, string>
}

export interface RetryConfig {
  maxRetries: number
  backoffMultiplier: number
  baseDelay: number
}
```

#### config.ts
```typescript
export const LLM_DEFAULTS = {
  model: "claude-3-7-sonnet-20250219",
  maxTokens: 2000,
  temperature: 0.5,
  timeout: 20000,
  retryConfig: {
    maxRetries: 2,
    backoffMultiplier: 2,
    baseDelay: 1000
  }
}

export const CHAT_CONFIG: Partial<LLMConfig> = {
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 10000
}

export const ANALYSIS_CONFIG: Partial<LLMConfig> = {
  maxTokens: 3000,
  temperature: 0.3,
  timeout: 30000,
  retryConfig: {
    maxRetries: 2,
    backoffMultiplier: 2,
    baseDelay: 1000
  }
}
```

### 2. Specialized Domain Services

#### ChatService.ts
```typescript
export class ChatService {
  constructor(private llmClient: LLMClient) {}
  
  async generateResponse(userMessage: string, dropId: number): Promise<string> {
    const history = await this.getConversationHistory(dropId)
    const prompt = this.createChatPrompt(userMessage, history)
    const config = this.getChatConfig()
    
    const rawResponse = await this.llmClient.request(prompt, config)
    return this.processChatResponse(rawResponse)
  }
  
  private getChatConfig(): LLMConfig
  private createChatPrompt(userMessage: string, history: ConversationMessage[]): string
  private processChatResponse(rawResponse: string): string
  private async getConversationHistory(dropId: number): Promise<ConversationMessage[]>
}
```

#### AnalysisService.ts
```typescript
export class AnalysisService {
  constructor(private llmClient: LLMClient) {}
  
  async generateAnalysis(userId: string): Promise<AnalysisResponse> {
    const drops = await this.getUnanalyzedDropsWithConversations(userId)
    this.validateDropCount(drops)
    
    const prompt = this.createAnalysisPrompt(drops)
    const config = this.getAnalysisConfig()
    
    const rawResponse = await this.llmClient.request(prompt, config)
    return this.parseAnalysisResponse(rawResponse)
  }
  
  private getAnalysisConfig(): LLMConfig
  private createAnalysisPrompt(drops: DropWithConversation[]): string
  private parseAnalysisResponse(rawResponse: string): AnalysisResponse
  private async getUnanalyzedDropsWithConversations(userId: string): Promise<DropWithConversation[]>
}
```

### 3. Service Registration & Dependency Injection

#### services/index.ts
```typescript
export class ServiceContainer {
  private static instance: ServiceContainer
  private llmClient: LLMClient
  private chatService: ChatService
  private analysisService: AnalysisService
  
  static getInstance(): ServiceContainer
  
  getLLMClient(): LLMClient
  getChatService(): ChatService
  getAnalysisService(): AnalysisService
}

// Usage in routes
const services = ServiceContainer.getInstance()
const chatService = services.getChatService()
const analysisService = services.getAnalysisService()
```

## Migration Strategy

### Phase 1: Create Shared Infrastructure
- Implement LLMClient with all shared functionality
- Create configuration system
- Set up service container

### Phase 2: Migrate Chat Service
- Create ChatService using LLMClient
- Update routes to use new ChatService
- Run parallel testing with old service

### Phase 3: Migrate Analysis Service
- Create AnalysisService using LLMClient
- Update routes to use new AnalysisService
- Run parallel testing with old service

### Phase 4: Cleanup & Testing
- Remove old anthropic.ts and analysisLLM.ts
- Update all imports and references
- Run full integration tests

### Phase 5: Monitoring & Optimization
- Add metrics and monitoring
- Optimize performance based on usage patterns
- Document new architecture

## Task List

### 1. Foundation Setup
- [ ] 1.1 Create `server/services/llm/` directory structure
- [ ] 1.2 Implement `LLMClient.ts` with core functionality
- [ ] 1.3 Create `types.ts` with shared interfaces
- [ ] 1.4 Implement `config.ts` with centralized configuration
- [ ] 1.5 Create service container pattern in `services/index.ts`
- [ ] 1.6 Write unit tests for LLMClient

### 2. LLMClient Implementation Details
- [ ] 2.1 Implement Anthropic client initialization and configuration
- [ ] 2.2 Add retry logic with exponential backoff
- [ ] 2.3 Implement global rate limiting mechanism
- [ ] 2.4 Add comprehensive error handling and logging
- [ ] 2.5 Implement request/response metrics collection
- [ ] 2.6 Add timeout handling with Promise.race
- [ ] 2.7 Create response extraction and validation utilities

### 3. Chat Service Migration
- [ ] 3.1 Create `server/services/chat/` directory
- [ ] 3.2 Implement `ChatService.ts` using LLMClient
- [ ] 3.3 Migrate chat-specific prompt engineering from anthropic.ts
- [ ] 3.4 Implement chat-specific configuration overrides
- [ ] 3.5 Add conversation history management
- [ ] 3.6 Create chat-specific response processing
- [ ] 3.7 Write unit tests for ChatService

### 4. Analysis Service Migration
- [ ] 4.1 Create `server/services/analysis/` directory
- [ ] 4.2 Implement `AnalysisService.ts` using LLMClient
- [ ] 4.3 Migrate analysis-specific prompt engineering from analysisLLM.ts
- [ ] 4.4 Implement analysis-specific configuration overrides
- [ ] 4.5 Add drop compilation and conversation handling
- [ ] 4.6 Create structured response parsing
- [ ] 4.7 Write unit tests for AnalysisService

### 5. Route Integration
- [ ] 5.1 Update chat routes to use new ChatService
- [ ] 5.2 Update analysis routes to use new AnalysisService
- [ ] 5.3 Implement service container injection in routes
- [ ] 5.4 Add error handling middleware for new services
- [ ] 5.5 Update route-level logging and monitoring

### 6. Testing & Validation
- [ ] 6.1 Create integration tests for new architecture
- [ ] 6.2 Run parallel testing with old and new services
- [ ] 6.3 Performance testing and benchmarking
- [ ] 6.4 Load testing for rate limiting and resource management
- [ ] 6.5 Error scenario testing (API failures, timeouts, etc.)
- [ ] 6.6 Mock testing strategy for different service layers

### 7. Cleanup & Documentation
- [ ] 7.1 Remove old `anthropic.ts` file
- [ ] 7.2 Remove old `analysisLLM.ts` file
- [ ] 7.3 Update all imports and references
- [ ] 7.4 Remove duplicate test files
- [ ] 7.5 Update API documentation
- [ ] 7.6 Create architecture documentation
- [ ] 7.7 Add developer guidelines for extending LLM services

### 8. Monitoring & Observability
- [ ] 8.1 Add LLM request metrics (count, latency, errors)
- [ ] 8.2 Implement cost tracking and budgeting
- [ ] 8.3 Add health check endpoints for LLM services
- [ ] 8.4 Create alerting for rate limits and failures
- [ ] 8.5 Add performance dashboards
- [ ] 8.6 Implement request tracing and debugging tools

### 9. Advanced Features (Future)
- [ ] 9.1 Add support for multiple LLM providers (OpenAI, etc.)
- [ ] 9.2 Implement request caching for identical prompts
- [ ] 9.3 Add A/B testing framework for prompts
- [ ] 9.4 Create prompt versioning and management
- [ ] 9.5 Add user-specific rate limiting
- [ ] 9.6 Implement streaming responses for long analyses

## Benefits After Refactoring

### Code Quality
- ✅ **Single Source of Truth**: All LLM interactions go through LLMClient
- ✅ **DRY Principle**: No duplicate configuration or error handling
- ✅ **Clear Separation**: Technical vs. business logic cleanly separated
- ✅ **Testability**: Each layer can be tested independently

### Operational Benefits
- ✅ **Resource Efficiency**: Single Anthropic client, global rate limiting
- ✅ **Centralized Monitoring**: All LLM metrics in one place
- ✅ **Easier Debugging**: Consistent logging across all LLM operations
- ✅ **Configuration Management**: Single place to update API keys, models

### Developer Experience
- ✅ **Easier Extension**: Adding new LLM use cases is straightforward
- ✅ **Consistent Patterns**: All services follow same architecture
- ✅ **Better Error Handling**: Comprehensive error context and recovery
- ✅ **Improved Testing**: Mock one client, test all services

### Future Flexibility
- ✅ **Provider Agnostic**: Easy to swap or add new LLM providers
- ✅ **Feature Rich**: Can add caching, A/B testing, cost tracking
- ✅ **Scalable**: Architecture supports multiple LLM use cases
- ✅ **Maintainable**: Changes in one place affect entire system

## Risk Assessment

### Low Risk
- ✅ Backward compatibility maintained during migration
- ✅ Parallel testing ensures functionality preservation
- ✅ Clear rollback strategy with old services

### Medium Risk
- ⚠️ Configuration changes might affect existing behavior
- ⚠️ Rate limiting changes could impact user experience
- ⚠️ Testing complexity increases with new architecture

### Mitigation Strategies
- 🛡️ Feature flags for gradual rollout
- 🛡️ Comprehensive integration testing
- 🛡️ Performance monitoring during migration
- 🛡️ Quick rollback procedures documented

## Success Metrics

### Technical Metrics
- **Code Duplication**: Reduce from ~400 lines to ~100 lines duplicated
- **Test Coverage**: Maintain >90% coverage across all services
- **Performance**: No degradation in response times
- **Error Rate**: Maintain <1% error rate during migration

### Operational Metrics
- **Development Velocity**: 25% faster feature development for LLM features
- **Bug Reduction**: 50% fewer LLM-related bugs due to centralized logic
- **Monitoring Coverage**: 100% of LLM requests tracked and monitored
- **Configuration Errors**: Eliminate configuration-related incidents

---

**Estimated Effort**: 2-3 weeks for full implementation and testing
**Priority**: Medium - Significant technical debt reduction and future flexibility
**Dependencies**: None - can be implemented independently of other features 