import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../../src/components/common/Navbar';
import { AuthContext } from '../../src/context/AuthContext';
import { ThemeContext } from '../../src/context/ThemeContext';

jest.mock('../../src/api/axiosInstance', () => ({
  get: jest.fn(),
  post: jest.fn(),
  interceptors: { response: { use: jest.fn() } },
}));

const mockUser = { displayName: 'JP Developer', avatar: null };

const renderNavbar = (user = mockUser) =>
  render(
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme: jest.fn() }}>
      <AuthContext.Provider value={{ user, logout: jest.fn(), loading: false }}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Navbar />
        </MemoryRouter>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );

describe('Navbar', () => {
  test('renders brand name', () => {
    renderNavbar();
    expect(screen.getByText('Finance Ledger')).toBeInTheDocument();
  });

  test('shows user display name when authenticated', () => {
    renderNavbar();
    expect(screen.getByText('JP Developer')).toBeInTheDocument();
  });

  test('shows logout button when authenticated', () => {
    renderNavbar();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  test('calls logout when logout button clicked', () => {
    const logoutMock = jest.fn();
    render(
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: jest.fn() }}>
        <AuthContext.Provider value={{ user: mockUser, logout: logoutMock, loading: false }}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Navbar />
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    );
    fireEvent.click(screen.getByText('Logout'));
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  test('does not show user info when not authenticated', () => {
    renderNavbar(null);
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });
});
