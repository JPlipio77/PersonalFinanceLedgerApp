import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../src/pages/LoginPage';
import { AuthContext } from '../../src/context/AuthContext';

// Mock axiosInstance to prevent real HTTP calls
jest.mock('../../src/api/axiosInstance', () => ({
  get: jest.fn().mockRejectedValue({ response: { status: 401 } }),
  post: jest.fn(),
  interceptors: { response: { use: jest.fn() } },
}));

const renderWithContext = (user = null) =>
  render(
    <AuthContext.Provider value={{ user, loading: false, logout: jest.fn() }}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('LoginPage', () => {
  test('renders sign-in button when not authenticated', () => {
    renderWithContext(null);
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
  });

  test('clicking sign-in button redirects to Google OAuth', () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    renderWithContext(null);
    fireEvent.click(screen.getByText(/sign in with google/i));
    expect(window.location.href).toContain('/auth/google');

    window.location = originalLocation;
  });
});
