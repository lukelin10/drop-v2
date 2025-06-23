import { render, screen } from '@testing-library/react';
import { AnalysisCard } from '../AnalysisCard';
import type { Analysis } from '@shared/schema';

// Mock the useLocation hook from wouter
const mockNavigate = jest.fn();
jest.mock('wouter', () => ({
  useLocation: () => ['/', mockNavigate],
}));

// Mock the formatDate utility
jest.mock('@/lib/utils', () => ({
  formatDate: (date: Date) => 'Jan 15, 2024',
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

const mockAnalysis: Analysis = {
  id: 1,
  userId: 'user1',
  content: 'This is a test analysis content.',
  summary: 'Test summary',
  bulletPoints: '• Point 1\n• Point 2',
  createdAt: new Date('2024-01-15'),
  isFavorited: false,
};

describe('AnalysisCard', () => {
  const mockOnToggleFavorite = jest.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockOnToggleFavorite.mockClear();
  });

  it('should render the analysis summary', () => {
    render(
      <AnalysisCard
        analysis={mockAnalysis}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    expect(screen.getByText('Test summary')).toBeInTheDocument();
  });

  it('should render the content preview', () => {
    render(
      <AnalysisCard
        analysis={mockAnalysis}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    expect(screen.getByText(/This is a test analysis content/)).toBeInTheDocument();
  });

  it('should render the heart button', () => {
    render(
      <AnalysisCard
        analysis={mockAnalysis}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    const heartButton = screen.getByRole('button');
    expect(heartButton).toBeInTheDocument();
  });
}); 