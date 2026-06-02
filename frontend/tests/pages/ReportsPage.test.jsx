import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportsPage from '../../src/pages/ReportsPage';
import { AuthContext } from '../../src/context/AuthContext';
import * as reportsApi from '../../src/api/reportsApi';

jest.mock('../../src/api/axiosInstance', () => ({
  get: jest.fn(),
  interceptors: { response: { use: jest.fn() } },
}));
jest.mock('../../src/api/reportsApi');

const mockUser = { _id: 'u1', displayName: 'JP', currency: 'USD' };

const mockMonthly = {
  month: 5, year: 2026,
  income: 3000, expense: 1200, net: 1800, transactionCount: 10,
  byCategory: [
    { categoryId: 'c1', name: 'Food',   icon: '🍔', color: '#f59e0b', total: 700, count: 5 },
    { categoryId: 'c2', name: 'Travel', icon: '✈️', color: '#10b981', total: 500, count: 3 },
  ],
  budgets: [
    { _id: 'b1', category: { _id: 'c1', name: 'Food', icon: '🍔' }, limitAmount: 1000, spent: 700, remaining: 300, percentUsed: 70 },
  ],
};

const mockYearly = {
  year: 2026,
  totalIncome: 36000, totalExpense: 14000, net: 22000,
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, income: 3000, expense: i < 5 ? 1200 : 0, net: i < 5 ? 1800 : 3000,
  })),
  byCategory: [
    { categoryId: 'c1', name: 'Food', icon: '🍔', total: 5000, count: 20 },
  ],
};

const renderPage = () =>
  render(
    <AuthContext.Provider value={{ user: mockUser, loading: false }}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ReportsPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  reportsApi.getMonthlyReport.mockResolvedValue(mockMonthly);
  reportsApi.getYearlyReport.mockResolvedValue(mockYearly);
});

describe('ReportsPage', () => {
  it('renders month/year controls and tabs', () => {
    renderPage();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Yearly')).toBeInTheDocument();
  });

  it('renders monthly overview cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('monthly-overview')).toBeInTheDocument();
      expect(screen.getByText('$3,000.00')).toBeInTheDocument();
      expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    });
  });

  it('renders category breakdown table', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('category-breakdown')).toBeInTheDocument();
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
    });
  });

  it('renders budget status section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('budget-status')).toBeInTheDocument();
      expect(screen.getByText(/70%/)).toBeInTheDocument();
    });
  });

  it('switches to yearly view and renders trend chart', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Yearly'));
    await waitFor(() => {
      expect(screen.getByTestId('yearly-overview')).toBeInTheDocument();
      expect(screen.getByTestId('yearly-trend-chart')).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    reportsApi.getMonthlyReport.mockRejectedValue({ response: { data: { message: 'Report error' } } });
    renderPage();
    await waitFor(() => expect(screen.getByText('Report error')).toBeInTheDocument());
  });
});
