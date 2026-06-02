import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TransactionsPage from '../../src/pages/TransactionsPage';
import { AuthContext } from '../../src/context/AuthContext';
import * as transactionsApi from '../../src/api/transactionsApi';
import * as categoriesApi from '../../src/api/categoriesApi';

jest.mock('../../src/api/axiosInstance', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: { response: { use: jest.fn() } },
}));

jest.mock('../../src/api/transactionsApi');
jest.mock('../../src/api/categoriesApi');

const mockUser = { _id: 'u1', displayName: 'Test User', currency: 'USD' };

const mockCategory = { _id: 'cat1', name: 'Food', icon: '🍔', color: '#f59e0b', isSystem: true };

const mockTransaction = {
  _id: 'tx1',
  type: 'expense',
  amount: 25.50,
  description: 'Lunch',
  category: mockCategory,
  date: '2026-01-15T00:00:00.000Z',
  currency: 'USD',
};

const renderPage = () =>
  render(
    <AuthContext.Provider value={{ user: mockUser, loading: false }}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TransactionsPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  transactionsApi.getTransactions.mockResolvedValue({
    data: [mockTransaction],
    pagination: { page: 1, limit: 20, total: 1, pages: 1 },
  });
  categoriesApi.getCategories.mockResolvedValue([mockCategory]);
});

describe('TransactionsPage', () => {
  it('renders the page title and Add button', async () => {
    renderPage();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('+ Add')).toBeInTheDocument());
  });

  it('renders a transaction row after loading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Lunch')).toBeInTheDocument());
    expect(screen.getAllByText(/🍔 Food/).length).toBeGreaterThan(0);
  });

  it('opens the New Transaction modal when Add is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('+ Add'));
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByText('New Transaction')).toBeInTheDocument();
  });

  it('closes the modal when Cancel is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('+ Add'));
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('New Transaction')).not.toBeInTheDocument();
  });

  it('calls createTransaction on form submit', async () => {
    transactionsApi.createTransaction.mockResolvedValue(mockTransaction);
    renderPage();
    await waitFor(() => screen.getByText('+ Add'));
    fireEvent.click(screen.getByText('+ Add'));

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '25.50' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Grocery run'), { target: { value: 'Test tx' } });

    // Select category
    const categorySelect = screen.getByDisplayValue('Select category…');
    fireEvent.change(categorySelect, { target: { value: 'cat1' } });

    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(transactionsApi.createTransaction).toHaveBeenCalled());
  });

  it('shows an error message when createTransaction fails', async () => {
    transactionsApi.createTransaction.mockRejectedValue({
      response: { data: { message: 'Category not found' } },
    });
    renderPage();
    await waitFor(() => screen.getByText('+ Add'));
    fireEvent.click(screen.getByText('+ Add'));

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '25' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Grocery run'), { target: { value: 'Bad tx' } });
    const categorySelect = screen.getByDisplayValue('Select category…');
    fireEvent.change(categorySelect, { target: { value: 'cat1' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(screen.getByText('Category not found')).toBeInTheDocument());
  });
});
