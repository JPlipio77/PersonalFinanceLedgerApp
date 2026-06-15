import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../../src/pages/SettingsPage';
import { AuthContext } from '../../src/context/AuthContext';
import * as recurringApi from '../../src/api/recurringApi';
import * as categoriesApi from '../../src/api/categoriesApi';
// useCategories calls getCategories() which returns the array directly

jest.mock('../../src/api/axiosInstance', () => ({
  get: jest.fn(),
  put: jest.fn().mockResolvedValue({ data: { data: { currency: 'EUR', emailAlerts: false } } }),
  interceptors: { response: { use: jest.fn() } },
}));
jest.mock('../../src/api/recurringApi');
jest.mock('../../src/api/categoriesApi');

const mockUser = { _id: 'u1', displayName: 'JP Developer', currency: 'USD', emailAlerts: true };

const mockRules = [
  {
    _id: 'r1', type: 'expense', amount: 50, currency: 'USD', description: 'Netflix',
    category: { _id: 'c1', name: 'Subscriptions', icon: '📺' },
    frequency: 'monthly', isActive: true,
  },
];

const mockCategories = [
  { _id: 'c1', name: 'Food', icon: '🍔', isSystem: true },
  { _id: 'c2', name: 'Subscriptions', icon: '📺', isSystem: true },
];

const renderPage = () =>
  render(
    <AuthContext.Provider value={{ user: mockUser, setUser: jest.fn(), loading: false }}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SettingsPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  recurringApi.listRules.mockResolvedValue({ data: mockRules, pagination: { total: 1 } });
  categoriesApi.getCategories.mockResolvedValue(mockCategories);
});

describe('SettingsPage', () => {
  it('renders preferences section with currency selector', () => {
    renderPage();
    expect(screen.getByLabelText(/Default Currency/i)).toBeInTheDocument();
    expect(screen.getByText(/Email budget alerts/i)).toBeInTheDocument();
  });

  it('renders recurring rules section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText(/monthly/i)).toBeInTheDocument();
    });
  });

  it('opens modal when Add Rule is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('+ Add Rule'));
    fireEvent.click(screen.getByText('+ Add Rule'));
    expect(screen.getByText('New Recurring Rule')).toBeInTheDocument();
  });

  it('opens edit modal when Edit is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByText('Edit Rule')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument();
  });

  it('shows empty state when no rules', async () => {
    recurringApi.listRules.mockResolvedValue({ data: [], meta: { total: 0 } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No recurring rules yet/i)).toBeInTheDocument();
    });
  });
});
