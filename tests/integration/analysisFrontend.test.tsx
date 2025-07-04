/**
 * Analysis Frontend Integration Tests
 * 
 * Tests the complete frontend analysis functionality with mocked API responses:
 * - Analysis progress tracking and eligibility checking
 * - Analysis creation workflow
 * - Analysis feed display and pagination
 * - Individual analysis detail view
 * - Favorite toggle functionality
 * - Error handling and loading states
 * 
 * These tests verify that all React components work together correctly
 * with realistic API interactions.
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Components under test
import Analysis from '../../client/src/pages/Analysis';
import AnalysisDetail from '../../client/src/pages/AnalysisDetail';
import AnalysisProgress from '../../client/src/components/AnalysisProgress';
import AnalysisCard from '../../client/src/components/AnalysisCard';
import AnalysisLoading from '../../client/src/components/AnalysisLoading';

// Mock the API calls
global.fetch = vi.fn();

// Mock React Router hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock toast notifications
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Test data
const mockAnalysis = {
  id: 1,
  userId: 'test-user',
  summary: 'Test analysis summary showing growth patterns',
  content: 'This analysis reveals significant emotional growth patterns. Your reflections demonstrate increasing self-awareness and emotional intelligence.\n\nThe consistency in your journaling practice has created a foundation for deeper insights. This regular engagement shows commitment to personal development.\n\nMoving forward, consider exploring specific action steps to translate these insights into daily practices.',
  bulletPoints: '• Consistent journaling practice\n• Growing emotional awareness\n• Strong foundation for development\n• Ready for action-oriented goals',
  isFavorited: false,
  createdAt: '2024-01-15T10:00:00Z'
};

const mockAnalyses = [
  mockAnalysis,
  {
    id: 2,
    userId: 'test-user',
    summary: 'Second analysis about resilience patterns',
    content: 'Your recent entries show remarkable resilience development...',
    bulletPoints: '• Resilience building\n• Stress management\n• Positive coping strategies',
    isFavorited: true,
    createdAt: '2024-01-10T10:00:00Z'
  }
];

const mockEligibilityResponse = {
  isEligible: true,
  unanalyzedCount: 5,
  requiredCount: 3
};

// Helper to render components with providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Analysis Frontend Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Analysis Progress Component', () => {
    test('displays progress when user is eligible for analysis', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEligibilityResponse,
      });

      renderWithProviders(<AnalysisProgress />);

      await waitFor(() => {
        expect(screen.getByText('5 of 3 entries ready')).toBeInTheDocument();
      });

      expect(screen.getByText('Run Analysis')).toBeInTheDocument();
      expect(screen.getByText('Drop deeper with an analysis after 3 entries')).toBeInTheDocument();
    });

    test('displays progress when user is not eligible', async () => {
      const ineligibleResponse = {
        isEligible: false,
        unanalyzedCount: 2,
        requiredCount: 3
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ineligibleResponse,
      });

      renderWithProviders(<AnalysisProgress />);

      await waitFor(() => {
        expect(screen.getByText('2 of 3 entries ready')).toBeInTheDocument();
      });

      const runButton = screen.getByText('Run Analysis');
      expect(runButton).toBeDisabled();
    });

    test('handles analysis creation successfully', async () => {
      const user = userEvent.setup();

      // Mock eligibility check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEligibilityResponse,
      });

      // Mock successful analysis creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysis,
      });

      renderWithProviders(<AnalysisProgress />);

      await waitFor(() => {
        expect(screen.getByText('Run Analysis')).toBeInTheDocument();
      });

      const runButton = screen.getByText('Run Analysis');
      await user.click(runButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Analyzing your entries...')).toBeInTheDocument();
      });

      // Should complete and show success
      await waitFor(() => {
        expect(screen.getByText('Analysis Complete!')).toBeInTheDocument();
      });
    });

    test('handles analysis creation failure', async () => {
      const user = userEvent.setup();

      // Mock eligibility check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEligibilityResponse,
      });

      // Mock failed analysis creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to create analysis' }),
      });

      renderWithProviders(<AnalysisProgress />);

      await waitFor(() => {
        expect(screen.getByText('Run Analysis')).toBeInTheDocument();
      });

      const runButton = screen.getByText('Run Analysis');
      await user.click(runButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to create analysis')).toBeInTheDocument();
      });
    });

    test('supports analysis cancellation', async () => {
      const user = userEvent.setup();

      // Mock eligibility check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEligibilityResponse,
      });

      renderWithProviders(<AnalysisProgress />);

      await waitFor(() => {
        expect(screen.getByText('Run Analysis')).toBeInTheDocument();
      });

      const runButton = screen.getByText('Run Analysis');
      await user.click(runButton);

      // Should show loading state with cancel button
      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // Should return to original state
      await waitFor(() => {
        expect(screen.getByText('Run Analysis')).toBeInTheDocument();
      });
    });
  });

  describe('Analysis Feed Page', () => {
    test('displays analyses when data is available', async () => {
      // Mock successful analyses fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analyses: mockAnalyses,
          hasMore: false
        }),
      });

      renderWithProviders(<Analysis />);

      await waitFor(() => {
        expect(screen.getByText('Test analysis summary showing growth patterns')).toBeInTheDocument();
        expect(screen.getByText('Second analysis about resilience patterns')).toBeInTheDocument();
      });

      // Should show both analyses
      const analysisCards = screen.getAllByTestId('analysis-card');
      expect(analysisCards).toHaveLength(2);
    });

    test('displays empty state when no analyses exist', async () => {
      // Mock empty analyses response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analyses: [],
          hasMore: false
        }),
      });

      renderWithProviders(<Analysis />);

      await waitFor(() => {
        expect(screen.getByText('No analyses yet')).toBeInTheDocument();
        expect(screen.getByText('Create your first analysis by journaling for 3 days')).toBeInTheDocument();
      });
    });

    test('displays loading state initially', async () => {
      // Mock delayed response
      (global.fetch as any).mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ analyses: mockAnalyses, hasMore: false })
          }), 100)
        )
      );

      renderWithProviders(<Analysis />);

      // Should show loading skeleton
      expect(screen.getByTestId('analyses-loading')).toBeInTheDocument();

      // Should eventually show data
      await waitFor(() => {
        expect(screen.getByText('Test analysis summary showing growth patterns')).toBeInTheDocument();
      });
    });

    test('handles pagination correctly', async () => {
      const user = userEvent.setup();

      // Mock first page
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analyses: mockAnalyses,
          hasMore: true
        }),
      });

      renderWithProviders(<Analysis />);

      await waitFor(() => {
        expect(screen.getAllByTestId('analysis-card')).toHaveLength(2);
      });

      // Mock second page
      const additionalAnalyses = [
        {
          id: 3,
          userId: 'test-user',
          summary: 'Third analysis about goal setting',
          content: 'Your goal-setting approach has evolved...',
          bulletPoints: '• Clear goal definition\n• Progress tracking\n• Milestone celebration',
          isFavorited: false,
          createdAt: '2024-01-05T10:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analyses: additionalAnalyses,
          hasMore: false
        }),
      });

      // Click load more button
      const loadMoreButton = screen.getByText('Load More');
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getAllByTestId('analysis-card')).toHaveLength(3);
        expect(screen.getByText('Third analysis about goal setting')).toBeInTheDocument();
      });

      // Load more button should be hidden when no more data
      expect(screen.queryByText('Load More')).not.toBeInTheDocument();
    });

    test('handles API errors gracefully', async () => {
      // Mock API error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Server error' }),
      });

      renderWithProviders(<Analysis />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load analyses')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    test('supports retry after error', async () => {
      const user = userEvent.setup();

      // Mock initial error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Server error' }),
      });

      renderWithProviders(<Analysis />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Mock successful retry
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analyses: mockAnalyses,
          hasMore: false
        }),
      });

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test analysis summary showing growth patterns')).toBeInTheDocument();
      });
    });
  });

  describe('Analysis Card Component', () => {
    test('displays analysis information correctly', () => {
      renderWithProviders(<AnalysisCard analysis={mockAnalysis} />);

      expect(screen.getByText('Test analysis summary showing growth patterns')).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByTestId('heart-icon-outline')).toBeInTheDocument(); // Not favorited
    });

    test('handles favorite toggle correctly', async () => {
      const user = userEvent.setup();

      // Mock successful favorite toggle
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockAnalysis, isFavorited: true }),
      });

      renderWithProviders(<AnalysisCard analysis={mockAnalysis} />);

      const heartButton = screen.getByTestId('heart-button');
      await user.click(heartButton);

      await waitFor(() => {
        expect(screen.getByTestId('heart-icon-filled')).toBeInTheDocument();
      });
    });

    test('handles favorite toggle failure', async () => {
      const user = userEvent.setup();

      // Mock failed favorite toggle
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to update favorite' }),
      });

      renderWithProviders(<AnalysisCard analysis={mockAnalysis} />);

      const heartButton = screen.getByTestId('heart-button');
      await user.click(heartButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to update favorite')).toBeInTheDocument();
      });

      // Heart should remain unfilled
      expect(screen.getByTestId('heart-icon-outline')).toBeInTheDocument();
    });

    test('navigates to detail page on click', async () => {
      const user = userEvent.setup();
      const mockNavigate = vi.fn();

      vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockNavigate);

      renderWithProviders(<AnalysisCard analysis={mockAnalysis} />);

      const cardContent = screen.getByText('Test analysis summary showing growth patterns');
      await user.click(cardContent);

      expect(mockNavigate).toHaveBeenCalledWith('/analysis/1');
    });
  });

  describe('Analysis Detail Page', () => {
    test('displays full analysis content', async () => {
      // Mock successful analysis fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysis,
      });

      renderWithProviders(<AnalysisDetail />);

      await waitFor(() => {
        expect(screen.getByText('Test analysis summary showing growth patterns')).toBeInTheDocument();
        expect(screen.getByText(/This analysis reveals significant emotional growth patterns/)).toBeInTheDocument();
        expect(screen.getByText('Consistent journaling practice')).toBeInTheDocument();
        expect(screen.getByText('Growing emotional awareness')).toBeInTheDocument();
      });
    });

    test('displays loading state initially', async () => {
      // Mock delayed response
      (global.fetch as any).mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => mockAnalysis
          }), 100)
        )
      );

      renderWithProviders(<AnalysisDetail />);

      expect(screen.getByTestId('analysis-detail-loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Test analysis summary showing growth patterns')).toBeInTheDocument();
      });
    });

    test('handles analysis not found', async () => {
      // Mock 404 response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Analysis not found' }),
      });

      renderWithProviders(<AnalysisDetail />);

      await waitFor(() => {
        expect(screen.getByText('Analysis not found')).toBeInTheDocument();
        expect(screen.getByText('Back to Analyses')).toBeInTheDocument();
      });
    });

    test('supports favorite toggle in detail view', async () => {
      const user = userEvent.setup();

      // Mock initial analysis fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysis,
      });

      renderWithProviders(<AnalysisDetail />);

      await waitFor(() => {
        expect(screen.getByTestId('heart-button')).toBeInTheDocument();
      });

      // Mock favorite toggle
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockAnalysis, isFavorited: true }),
      });

      const heartButton = screen.getByTestId('heart-button');
      await user.click(heartButton);

      await waitFor(() => {
        expect(screen.getByTestId('heart-icon-filled')).toBeInTheDocument();
      });
    });

    test('supports back navigation', async () => {
      const user = userEvent.setup();
      const mockNavigate = vi.fn();

      vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockNavigate);

      // Mock analysis fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysis,
      });

      renderWithProviders(<AnalysisDetail />);

      await waitFor(() => {
        expect(screen.getByTestId('back-button')).toBeInTheDocument();
      });

      const backButton = screen.getByTestId('back-button');
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/analysis');
    });
  });

  describe('Analysis Loading Component', () => {
    test('displays loading messages and progress', async () => {
      renderWithProviders(
        <AnalysisLoading
          isVisible={true}
          onCancel={() => { }}
          messages={['Analyzing entries...', 'Finding patterns...', 'Generating insights...']}
        />
      );

      expect(screen.getByText('Analyzing entries...')).toBeInTheDocument();
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('cycles through messages during analysis', async () => {
      const messages = ['Message 1', 'Message 2', 'Message 3'];

      renderWithProviders(
        <AnalysisLoading
          isVisible={true}
          onCancel={() => { }}
          messages={messages}
        />
      );

      expect(screen.getByText('Message 1')).toBeInTheDocument();

      // Wait for message cycling (messages change every 3 seconds)
      await waitFor(() => {
        expect(screen.getByText('Message 2')).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    test('handles cancel action', async () => {
      const user = userEvent.setup();
      const mockCancel = vi.fn();

      renderWithProviders(
        <AnalysisLoading
          isVisible={true}
          onCancel={mockCancel}
          messages={['Analyzing...']}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockCancel).toHaveBeenCalled();
    });

    test('hides when not visible', () => {
      renderWithProviders(
        <AnalysisLoading
          isVisible={false}
          onCancel={() => { }}
          messages={['Analyzing...']}
        />
      );

      expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    test('catches and displays component errors', async () => {
      // Mock a component that throws an error
      const ErrorComponent = () => {
        throw new Error('Test component error');
      };

      const { AnalysisErrorBoundary } = await import('../../client/src/components/AnalysisErrorBoundary');

      renderWithProviders(
        <AnalysisErrorBoundary>
          <ErrorComponent />
        </AnalysisErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Something went wrong with the analysis feature')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    test('supports error recovery', async () => {
      const user = userEvent.setup();
      let shouldError = true;

      const ConditionalErrorComponent = () => {
        if (shouldError) {
          throw new Error('Test error');
        }
        return <div>Component working</div>;
      };

      const { AnalysisErrorBoundary } = await import('../../client/src/components/AnalysisErrorBoundary');

      renderWithProviders(
        <AnalysisErrorBoundary>
          <ConditionalErrorComponent />
        </AnalysisErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Fix the error condition
      shouldError = false;

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Component working')).toBeInTheDocument();
      });
    });
  });

  describe('Network Connectivity Integration', () => {
    test('handles offline state gracefully', async () => {
      // Mock network status
      const mockNetworkStatus = { isOnline: false, isSlowConnection: false };

      vi.doMock('../../client/src/hooks/useNetworkStatus', () => ({
        useNetworkStatus: () => mockNetworkStatus,
      }));

      renderWithProviders(<Analysis />);

      await waitFor(() => {
        expect(screen.getByText('You appear to be offline')).toBeInTheDocument();
        expect(screen.getByText('Some features may not work properly')).toBeInTheDocument();
      });
    });

    test('handles slow connection state', async () => {
      const mockNetworkStatus = { isOnline: true, isSlowConnection: true };

      vi.doMock('../../client/src/hooks/useNetworkStatus', () => ({
        useNetworkStatus: () => mockNetworkStatus,
      }));

      renderWithProviders(<Analysis />);

      await waitFor(() => {
        expect(screen.getByText('Slow connection detected')).toBeInTheDocument();
      });
    });

    test('retries requests when connection is restored', async () => {
      const mockNetworkStatus = { isOnline: true, isSlowConnection: false };

      // Mock initial network failure
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Mock successful retry
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ analyses: mockAnalyses, hasMore: false }),
      });

      renderWithProviders(<Analysis />);

      await waitFor(() => {
        expect(screen.getByText('Test analysis summary showing growth patterns')).toBeInTheDocument();
      });
    });
  });
}); 