import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BudgetsPage from '../../src/pages/BudgetsPage';
import { AuthContext } from '../../src/context/AuthContext';
import * as budgetsApi from '../../src/api/budgetsApi';
import * as categoriesApi from '../../src/api/categoriesApi';

jest.mock('../../src/api/axiosInstance', () => ({
  get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(),
  interceptors: { response: { use: jest.fn() } },
}));
jest.mock('../../src/api/budgetsApi');
jest.mock('../../src/api/categoriesApi');

const mockUser = { _id: 'u1', currency: 'USD', displayName: 'Test' };

const mockBudget = {
  _id: 'b1', month: 5, year: 2026,
  category: { _id: 'cat1', name: 'Food', icon: '🍔', color: '#f59e0b' },
  limitAmount: 200, spent: 120, remaining: 80,
  percentUsed: 0.6, alertThreshold: 0.8, currency: 'USD', alertSent: false,
};

const mockSummary = { totalLimit: 200, totalSpent: 120, totalRemaining: 80, adherenceRate: 0.6, budgets: [mockBudget] };

const renderPage = () =>
  render(
    <AuthContext.Provider value={{ user: mockUser, loading: false }}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BudgetsPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  budgetsApi.getBudgets.mockResolvedValue([mockBudget]);
  budgetsApi.getBudgetSummary.mockResolvedValue(mockSummary);
  categoriesApi.getCategories.mockResolvedValue([
    { _id: 'cat1', name: 'Food', icon: '🍔', color: '#f59e0b', isSystem: true },
  ]);
});

describe('BudgetsPage', () => {
  it('renders the page title', async () => {
    renderPage();
    expect(screen.getByText('Budgets')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Food')).toBeInTheDocument());
  });

  it('shows summary banner with totals', async () => {
    renderPage();
    // Summary banner uses formatCurrency default (PHP), individual cards use budget.currency (USD)
    await waitFor(() => expect(screen.getAllByText(/200\.00/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/120\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/80\.00/).length).toBeGreaterThan(0);
  });

  it('shows percent used in each budget card', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('60% used')).toBeInTheDocument());
  });

  it('opens the Set Budget modal', async () => {
    renderPage();
    await waitFor(() => screen.getByText('+ Set Budget'));
    fireEvent.click(screen.getByText('+ Set Budget'));
    expect(screen.getByText('Set Budget')).toBeInTheDocument();
  });

  it('calls upsertBudget on form submit', async () => {
    // Start with no budgets so all categories appear in the "Set Budget" select
    budgetsApi.getBudgets.mockResolvedValue([]);
    budgetsApi.getBudgetSummary.mockResolvedValue({ totalLimit: 0, totalSpent: 0, totalRemaining: 0, budgets: [] });
    budgetsApi.upsertBudget.mockResolvedValue(mockBudget);

    renderPage();
    await waitFor(() => screen.getByText('+ Set Budget'));
    fireEvent.click(screen.getByText('+ Set Budget'));

    // Select category
    const catSelect = screen.getByDisplayValue('Select category…');
    fireEvent.change(catSelect, { target: { value: 'cat1' } });

    fireEvent.change(screen.getByPlaceholderText('e.g. 500'), { target: { value: '300' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(budgetsApi.upsertBudget).toHaveBeenCalled());
  });
});
