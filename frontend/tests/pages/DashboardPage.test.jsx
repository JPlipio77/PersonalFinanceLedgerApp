import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../../src/pages/DashboardPage';
import { AuthContext } from '../../src/context/AuthContext';
import * as dashboardApi from '../../src/api/dashboardApi';

jest.mock('../../src/api/axiosInstance', () => ({
  get: jest.fn(),
  interceptors: { response: { use: jest.fn() } },
}));
jest.mock('../../src/api/dashboardApi');

// Recharts uses SVG/canvas — stub ResizeObserver and resize
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const mockUser = { _id: 'u1', displayName: 'JP Developer', currency: 'USD' };

const mockOverview = {
  month: 5, year: 2026,
  income: 3000, expense: 1200, net: 1800,
  transactionCount: 8, budgetCount: 3, adherenceRate: 0.85,
};

const mockRecent = [
  { _id: 't1', type: 'expense', amount: 25, currency: 'USD', description: 'Lunch',
    category: { name: 'Food', icon: '🍔', color: '#f59e0b' }, date: '2026-05-15T00:00:00Z' },
  { _id: 't2', type: 'income',  amount: 3000, currency: 'USD', description: 'Salary',
    category: { name: 'Salary', icon: '💰', color: '#22c55e' }, date: '2026-05-01T00:00:00Z' },
];

const mockByCategory = [
  { categoryId: 'c1', name: 'Food',   icon: '🍔', color: '#f59e0b', total: 400, count: 8 },
  { categoryId: 'c2', name: 'Travel', icon: '✈️', color: '#10b981', total: 200, count: 2 },
];

const mockTrend = [
  { year: 2026, month: 3, income: 2800, expense: 1000 },
  { year: 2026, month: 4, income: 3100, expense: 1100 },
  { year: 2026, month: 5, income: 3000, expense: 1200 },
];

const renderPage = () =>
  render(
    <AuthContext.Provider value={{ user: mockUser, loading: false }}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DashboardPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  dashboardApi.getOverview.mockResolvedValue(mockOverview);
  dashboardApi.getRecentTransactions.mockResolvedValue(mockRecent);
  dashboardApi.getSpendingByCategory.mockResolvedValue(mockByCategory);
  dashboardApi.getTrend.mockResolvedValue(mockTrend);
});

describe('DashboardPage', () => {
  it('shows a spinner while loading', () => {
    // Keep promises pending
    dashboardApi.getOverview.mockReturnValue(new Promise(() => {}));
    renderPage();
    // Spinner renders as a div with the spin animation
    expect(document.querySelector('[style*="spin"]')).toBeTruthy();
  });

  it('renders greeting with user first name', async () => {
    renderPage();
    // Greeting shows first name only: "Good <time>, JP"
    await waitFor(() => expect(screen.getByText(/good .+, jp/i)).toBeInTheDocument());
  });

  it('renders overview cards with correct values', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('$3,000.00')).toBeInTheDocument(); // income
      expect(screen.getByText('$1,200.00')).toBeInTheDocument(); // expense
      expect(screen.getByText('$1,800.00')).toBeInTheDocument(); // net
      expect(screen.getByText('85%')).toBeInTheDocument();       // adherence
    });
  });

  it('renders recent transactions', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Lunch')).toBeInTheDocument();
      expect(screen.getByText('Salary')).toBeInTheDocument();
    });
  });

  it('renders chart containers', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('spending-bar-chart')).toBeInTheDocument();
    });
  });

  it('shows empty state for charts when no data', async () => {
    dashboardApi.getSpendingByCategory.mockResolvedValue([]);
    dashboardApi.getTrend.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No spending data for this period')).toBeInTheDocument();
      expect(screen.getByText('No trend data')).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    dashboardApi.getOverview.mockRejectedValue({ response: { data: { message: 'Server error' } } });
    renderPage();
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
  });

  it('renders "View all" link to /transactions', async () => {
    renderPage();
    await waitFor(() => {
      const link = screen.getByText('View all →');
      expect(link.closest('a')).toHaveAttribute('href', '/transactions');
    });
  });
});
