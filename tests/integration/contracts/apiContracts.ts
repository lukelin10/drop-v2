/**
 * API Contract Validation
 * 
 * Provides contract validation helpers for integration tests.
 * These ensure API responses maintain expected structure and types.
 */

/**
 * Validates analysis API response contract
 */
export const verifyAnalysisAPIContract = (response: any) => {
  expect(response).toMatchObject({
    id: expect.any(Number),
    userId: expect.any(String),
    summary: expect.any(String),
    content: expect.any(String),
    bulletPoints: expect.any(String),
    isFavorited: expect.any(Boolean),
    createdAt: expect.any(Date)
  });

  // Additional validation
  expect(response.id).toBeGreaterThan(0);
  expect(response.summary.length).toBeGreaterThan(0);
  expect(response.content.length).toBeGreaterThan(0);
  expect(response.bulletPoints).toContain('•');
  expect(new Date(response.createdAt)).toBeInstanceOf(Date);
};

/**
 * Validates drop API response contract
 */
export const verifyDropAPIContract = (response: any) => {
  expect(response).toMatchObject({
    id: expect.any(Number),
    userId: expect.any(String),
    questionId: expect.any(Number),
    text: expect.any(String),
    createdAt: expect.any(String),
    messageCount: expect.any(Number)
  });

  expect(response.id).toBeGreaterThan(0);
  expect(response.questionId).toBeGreaterThan(0);
  expect(response.text.length).toBeGreaterThan(0);
  expect(response.messageCount).toBeGreaterThanOrEqual(0);
};

/**
 * Validates drop with question API response contract
 */
export const verifyDropWithQuestionAPIContract = (response: any) => {
  verifyDropAPIContract(response);
  expect(response).toMatchObject({
    questionText: expect.any(String)
  });
  expect(response.questionText.length).toBeGreaterThan(0);
};

/**
 * Validates message API response contract
 */
export const verifyMessageAPIContract = (response: any) => {
  expect(response).toMatchObject({
    id: expect.any(Number),
    dropId: expect.any(Number),
    text: expect.any(String),
    fromUser: expect.any(Boolean),
    createdAt: expect.any(String)
  });

  expect(response.id).toBeGreaterThan(0);
  expect(response.dropId).toBeGreaterThan(0);
  expect(response.text.length).toBeGreaterThan(0);
  expect(new Date(response.createdAt)).toBeInstanceOf(Date);
};

/**
 * Validates user API response contract
 */
export const verifyUserAPIContract = (response: any) => {
  expect(response).toMatchObject({
    id: expect.any(String),
    username: expect.any(String),
    email: expect.any(String),
    createdAt: expect.any(String),
    updatedAt: expect.any(String)
  });

  expect(response.id.length).toBeGreaterThan(0);
  expect(response.username.length).toBeGreaterThan(0);
  expect(response.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};

/**
 * Validates analysis eligibility API response contract
 */
export const verifyAnalysisEligibilityAPIContract = (response: any) => {
  expect(response).toMatchObject({
    isEligible: expect.any(Boolean),
    unanalyzedCount: expect.any(Number),
    requiredCount: expect.any(Number)
  });

  expect(response.unanalyzedCount).toBeGreaterThanOrEqual(0);
  expect(response.requiredCount).toBeGreaterThan(0);

  if (response.isEligible) {
    expect(response.unanalyzedCount).toBeGreaterThanOrEqual(response.requiredCount);
  }
};

/**
 * Validates question API response contract
 */
export const verifyQuestionAPIContract = (response: any) => {
  expect(response).toMatchObject({
    id: expect.any(Number),
    text: expect.any(String),
    isActive: expect.any(Boolean),
    category: expect.any(String),
    createdAt: expect.any(String)
  });

  expect(response.id).toBeGreaterThan(0);
  expect(response.text.length).toBeGreaterThan(0);
  expect(['general', 'daily', 'reflection', 'goal']).toContain(response.category);
};

/**
 * Validates error response contract
 */
export const verifyErrorAPIContract = (response: any, expectedStatus: number) => {
  expect(response).toMatchObject({
    message: expect.any(String),
    error: expect.any(String)
  });

  expect(response.message.length).toBeGreaterThan(0);
  expect([400, 401, 403, 404, 500]).toContain(expectedStatus);
};

/**
 * Validates paginated response contract
 */
export const verifyPaginatedAPIContract = (response: any, itemValidator: (item: any) => void) => {
  expect(response).toMatchObject({
    data: expect.any(Array),
    pagination: expect.objectContaining({
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number),
      totalPages: expect.any(Number)
    })
  });

  expect(response.pagination.page).toBeGreaterThan(0);
  expect(response.pagination.limit).toBeGreaterThan(0);
  expect(response.pagination.total).toBeGreaterThanOrEqual(0);
  expect(response.pagination.totalPages).toBeGreaterThanOrEqual(0);

  // Validate each item in the data array
  response.data.forEach(itemValidator);
};

/**
 * Validates health check API response contract
 */
export const verifyHealthCheckAPIContract = (response: any) => {
  expect(response).toMatchObject({
    healthy: expect.any(Boolean),
    timestamp: expect.any(String),
    services: expect.any(Object)
  });

  expect(new Date(response.timestamp)).toBeInstanceOf(Date);

  // Validate service status structure
  Object.keys(response.services).forEach(serviceName => {
    expect(response.services[serviceName]).toMatchObject({
      healthy: expect.any(Boolean),
      responseTime: expect.any(Number)
    });
    expect(response.services[serviceName].responseTime).toBeGreaterThanOrEqual(0);
  });
};

/**
 * Validates daily question API response contract
 */
export const verifyDailyQuestionAPIContract = (response: any) => {
  expect(response).toMatchObject({
    question: expect.any(String)
  });

  expect(response.question.length).toBeGreaterThan(0);
  expect(response.question).toMatch(/\?$/); // Should end with question mark
};

/**
 * Helper to validate array responses
 */
export const verifyArrayResponse = (response: any[], itemValidator: (item: any) => void) => {
  expect(Array.isArray(response)).toBe(true);
  response.forEach(itemValidator);
};

/**
 * Helper to validate successful API response structure
 */
export const verifySuccessResponse = (httpResponse: any, dataValidator?: (data: any) => void) => {
  expect(httpResponse.status).toBeGreaterThanOrEqual(200);
  expect(httpResponse.status).toBeLessThan(300);

  if (dataValidator && httpResponse.body) {
    dataValidator(httpResponse.body);
  }
};

/**
 * Helper to validate error API response structure
 */
export const verifyErrorResponse = (httpResponse: any, expectedStatus: number) => {
  expect(httpResponse.status).toBe(expectedStatus);
  verifyErrorAPIContract(httpResponse.body, expectedStatus);
}; 