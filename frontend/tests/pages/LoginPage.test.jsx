import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../src/pages/LoginPage';
import { AuthContext } from '../../src/context/AuthContext';
import axiosInstance from '../../src/api/axiosInstance';

jest.mock('../../src/api/axiosInstance', () => ({
  get:  jest.fn().mockRejectedValue({ response: { status: 401 } }),
  post: jest.fn(),
  interceptors: { response: { use: jest.fn() } },
}));

const mockSetUser = jest.fn();

const renderPage = (user = null) =>
  render(
    <AuthContext.Provider value={{ user, setUser: mockSetUser, loading: false, logout: jest.fn() }}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );

// resetAllMocks clears both history AND queued mockResolvedValueOnce responses,
// preventing unconsumed mocks from leaking between tests.
beforeEach(() => jest.resetAllMocks());

describe('LoginPage', () => {
  // ── Rendering ────────────────────────────────────────────────────────────

  test('renders Login and Create Account tabs', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getAllByText('Create Account').length).toBeGreaterThan(0);
  });

  test('renders Google sign-in button', () => {
    renderPage();
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
  });

  test('login tab shows email and password inputs by default', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  test('shows Forgot Password link on login tab', () => {
    renderPage();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  // ── Google OAuth ─────────────────────────────────────────────────────────

  test('clicking Sign in with Google redirects to OAuth endpoint', () => {
    const origLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    renderPage();
    fireEvent.click(screen.getByText(/sign in with google/i));
    expect(window.location.href).toContain('/auth/google');

    window.location = origLocation;
  });

  // ── Tab switching ────────────────────────────────────────────────────────

  test('switching to Create Account tab shows registration fields', () => {
    renderPage();
    fireEvent.click(screen.getAllByText('Create Account')[0]);
    expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument();
    expect(screen.getByText(/birthday/i)).toBeInTheDocument();
  });

  // ── Login form ───────────────────────────────────────────────────────────

  test('successful login calls setUser', async () => {
    axiosInstance.post.mockResolvedValueOnce({ data: { data: { email: 'user@test.com' } } });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret123' } });
    // Use exact name 'Sign In' to avoid matching 'Sign in with Google'
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(mockSetUser).toHaveBeenCalledWith({ email: 'user@test.com' }));
  });

  test('failed login shows error message', async () => {
    axiosInstance.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid email or password' } },
    });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'bad@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() =>
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    );
  });

  // ── Register form ────────────────────────────────────────────────────────

  test('register shows error when passwords do not match', async () => {
    renderPage();
    fireEvent.click(screen.getAllByText('Create Account')[0]);

    fireEvent.change(screen.getByPlaceholderText('Email address (this will be your username)'), { target: { value: 'new@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password (min. 8 characters)'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'different123' } });
    fireEvent.click(screen.getAllByText('Create Account').at(-1));

    await waitFor(() =>
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    );
  });

  test('register shows error when password is too short', async () => {
    renderPage();
    fireEvent.click(screen.getAllByText('Create Account')[0]);

    fireEvent.change(screen.getByPlaceholderText('Email address (this will be your username)'), { target: { value: 'new@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password (min. 8 characters)'), { target: { value: 'short' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'short' } });
    fireEvent.click(screen.getAllByText('Create Account').at(-1));

    await waitFor(() =>
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    );
  });

  test('successful registration calls setUser', async () => {
    axiosInstance.post.mockResolvedValueOnce({ data: { data: { email: 'new@test.com' } } });
    renderPage();
    fireEvent.click(screen.getAllByText('Create Account')[0]);

    fireEvent.change(screen.getByPlaceholderText('Email address (this will be your username)'), { target: { value: 'new@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password (min. 8 characters)'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getAllByText('Create Account').at(-1));

    await waitFor(() => expect(mockSetUser).toHaveBeenCalledWith({ email: 'new@test.com' }));
  });

  // ── Forgot password modal ────────────────────────────────────────────────

  test('opens Forgot Password modal when link is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText(/forgot password/i));
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  test('closes Forgot Password modal on Cancel', () => {
    renderPage();
    fireEvent.click(screen.getByText(/forgot password/i));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText('Reset Password')).not.toBeInTheDocument();
  });

  test('Forgot Password form submits and shows confirmation', async () => {
    axiosInstance.post.mockResolvedValueOnce({ data: {} });
    renderPage();
    fireEvent.click(screen.getByText(/forgot password/i));

    const emailInputs = screen.getAllByPlaceholderText('Email address');
    fireEvent.change(emailInputs.at(-1), { target: { value: 'user@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    // The success message text: "...we've sent a password reset link."
    await waitFor(() =>
      expect(screen.getByText(/password reset link/i)).toBeInTheDocument()
    );
  });
});
