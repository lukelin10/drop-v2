import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'wouter/memory-location';
import Analysis from '../Analysis';
import type { Analysis as AnalysisType } from '@shared/schema';

// Mock the custom hooks
const mockUseAnalyses = {
  analyses: [],
  isLoading: false,
  error: null,
  hasMore: false,
  isCreatingAnalysis: false,
  createAnalysis: jest.fn(),
  toggleFavorite: jest.fn(),
  loadMoreAnalyses: jest.fn(),
};

const mockUseAnalysisEligibility = {
  isEligible: false,
  refetch: jest.fn(),
};

jest.mock('@/hooks/useAnalyses', () => ({
  useAnalyses: () => mockUseAnalyses,
}));

jest.mock('@/hooks/useAnalysisEligibility', () => ({
  useAnalysisEligibility: () => mockUseAnalysisEligibility,
}));

// Mock the AppContext
const mockSetLoading = jest.fn();
jest.mock('@/context/AppContext', () => ({
  useAppContext: () => ({
    setLoading: mockSetLoading,
  }),
}));

// Mock the toast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock child components
jest.mock('@/components/AnalysisProgress', () => ({
  AnalysisProgress: ({ onAnalysisComplete }: { onAnalysisComplete: () => void }) => (
    <div data-testid="analysis-progress">
      <button onClick={onAnalysisComplete}>Mock Progress</button>
    </div>
  ),
}));

jest.mock('@/components/AnalysisCard', () => ({
  AnalysisCard: ({
    analysis,
    onToggleFavorite
  }: {
    analysis: AnalysisType;
    onToggleFavorite: (id: number, isFavorited: boolean) => void;
  }) => (
    <div data-testid={`analysis-card-${analysis.id}`}>
      <h3>{analysis.summary}</h3>
      <button onClick={() => onToggleFavorite(analysis.id, !analysis.isFavorited)}>
        Toggle Favorite
      </button>
    </div>
  ),
}));

const mockAnalyses: AnalysisType[] = [
  {
    id: 1,
    userId: 'user1',
    content: 'Analysis content 1',
    summary: 'First analysis summary',
    bulletPoints: '• Point 1\n• Point 2',
    createdAt: new Date('2024-01-15'),
    isFavorited: false,
  },
  {
    id: 2,
    userId: 'user1',
    content: 'Analysis content 2',
    summary: 'Second analysis summary',
    bulletPoints: '• Point 3\n• Point 4',
    createdAt: new Date('2024-01-10'),
    isFavorited: true,
  },
];

describe('Analysis Page', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    Object.assign(mockUseAnalyses, {
      analyses: [],
      isLoading: false,
      error: null,
      hasMore: false,
      isCreatingAnalysis: false,
      createAnalysis: jest.fn(),
      toggleFavorite: jest.fn(),
      loadMoreAnalyses: jest.fn(),
    });

    Object.assign(mockUseAnalysisEligibility, {
      isEligible: false,
      refetch: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render the analysis progress component', () => {
      render(<Analysis />, { wrapper: createWrapper() });

      expect(screen.getByTestId('analysis-progress')).toBeInTheDocument();
    });

    it('should render the page title and empty state when no analyses', () => {
      render(<Analysis />, { wrapper: createWrapper() });

      expect(screen.getByText('Your Analyses')).toBeInTheDocument();
      expect(screen.getByText('No analyses yet')).toBeInTheDocument();
    });

    it('should render analyses when available', () => {
      Object.assign(mockUseAnalyses, {
        analyses: mockAnalyses,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      expect(screen.getByTestId('analysis-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('analysis-card-2')).toBeInTheDocument();
      expect(screen.getByText('First analysis summary')).toBeInTheDocument();
      expect(screen.getByText('Second analysis summary')).toBeInTheDocument();
      expect(screen.getByText('2 analyses')).toBeInTheDocument();
    });

    it('should render singular form for single analysis', () => {
      Object.assign(mockUseAnalyses, {
        analyses: [mockAnalyses[0]],
      });

      render(<Analysis />, { wrapper: createWrapper() });

      expect(screen.getByText('1 analysis')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should render loading skeletons when loading and no analyses', () => {
      Object.assign(mockUseAnalyses, {
        isLoading: true,
        analyses: [],
      });

      render(<Analysis />, { wrapper: createWrapper() });

      const skeletons = screen.getAllByTestId(/animate-pulse/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should call setLoading when creating analysis', () => {
      Object.assign(mockUseAnalyses, {
        isCreatingAnalysis: true,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    it('should render load more button when hasMore is true', () => {
      Object.assign(mockUseAnalyses, {
        analyses: mockAnalyses,
        hasMore: true,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    it('should show loading state on load more button when loading', () => {
      Object.assign(mockUseAnalyses, {
        analyses: mockAnalyses,
        hasMore: true,
        isLoading: true,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error toast when error occurs', () => {
      Object.assign(mockUseAnalyses, {
        error: 'Failed to fetch analyses',
      });

      render(<Analysis />, { wrapper: createWrapper() });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to fetch analyses',
        variant: 'destructive',
      });
    });
  });

  describe('Empty States', () => {
    it('should show create analysis button when eligible and no analyses', () => {
      Object.assign(mockUseAnalysisEligibility, {
        isEligible: true,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      expect(screen.getByText('Create Analysis')).toBeInTheDocument();
      expect(screen.getByText('You have enough drops to create your first analysis!')).toBeInTheDocument();
    });

    it('should show encouraging message when not eligible', () => {
      Object.assign(mockUseAnalysisEligibility, {
        isEligible: false,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      expect(screen.getByText('Keep reflecting! You need 3 drops to generate your first analysis.')).toBeInTheDocument();
    });

    it('should not show create button when not eligible', () => {
      Object.assign(mockUseAnalysisEligibility, {
        isEligible: false,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      expect(screen.queryByText('Create Analysis')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call createAnalysis when create button is clicked', () => {
      Object.assign(mockUseAnalysisEligibility, {
        isEligible: true,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      const createButton = screen.getByText('Create Analysis');
      fireEvent.click(createButton);

      expect(mockUseAnalyses.createAnalysis).toHaveBeenCalled();
    });

    it('should call toggleFavorite when favorite is toggled', () => {
      Object.assign(mockUseAnalyses, {
        analyses: mockAnalyses,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      const favoriteButton = screen.getAllByText('Toggle Favorite')[0];
      fireEvent.click(favoriteButton);

      expect(mockUseAnalyses.toggleFavorite).toHaveBeenCalledWith(1, true);
    });

    it('should call loadMoreAnalyses when load more is clicked', () => {
      Object.assign(mockUseAnalyses, {
        analyses: mockAnalyses,
        hasMore: true,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      const loadMoreButton = screen.getByText('Load More');
      fireEvent.click(loadMoreButton);

      expect(mockUseAnalyses.loadMoreAnalyses).toHaveBeenCalled();
    });

    it('should not call loadMoreAnalyses when loading', () => {
      Object.assign(mockUseAnalyses, {
        analyses: mockAnalyses,
        hasMore: true,
        isLoading: true,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      const loadMoreButton = screen.getByText('Loading...');
      fireEvent.click(loadMoreButton);

      expect(mockUseAnalyses.loadMoreAnalyses).not.toHaveBeenCalled();
    });
  });

  describe('Analysis Creation Success', () => {
    it('should show success toast and refresh eligibility on successful creation', async () => {
      const mockCreateAnalysis = jest.fn((params) => {
        params?.onSuccess?.(mockAnalyses[0]);
      });

      Object.assign(mockUseAnalyses, {
        createAnalysis: mockCreateAnalysis,
      });
      Object.assign(mockUseAnalysisEligibility, {
        isEligible: true,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      const createButton = screen.getByText('Create Analysis');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Analysis Complete',
          description: 'Your new analysis is ready to explore.',
        });
        expect(mockUseAnalysisEligibility.refetch).toHaveBeenCalled();
      });
    });

    it('should show error toast on failed creation', async () => {
      const mockCreateAnalysis = jest.fn((params) => {
        params?.onError?.(new Error('Insufficient drops'));
      });

      Object.assign(mockUseAnalyses, {
        createAnalysis: mockCreateAnalysis,
      });

      render(<Analysis />, { wrapper: createWrapper() });

      const progressButton = screen.getByText('Mock Progress');
      fireEvent.click(progressButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Analysis Failed',
          description: 'Insufficient drops',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Analysis Progress Integration', () => {
    it('should refresh eligibility when analysis is completed', () => {
      render(<Analysis />, { wrapper: createWrapper() });

      const progressButton = screen.getByText('Mock Progress');
      fireEvent.click(progressButton);

      expect(mockUseAnalysisEligibility.refetch).toHaveBeenCalled();
    });
  });
}); 