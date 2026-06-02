import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResetPasswordPage from '../../src/pages/ResetPasswordPage';
import axiosInstance from '../../src/api/axiosInstance';

jest.mock('../../src/api/axiosInstance', () => ({
  get:  jest.fn(),
  post: jest.fn(),
  interceptors: { response: { use: jest.fn() } },
}));

const renderWithToken = (token) =>
  render(
    <MemoryRouter
      initialEntries={[token ? `/reset-password?token=${token}` : '/reset-password']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => jest.clearAllMocks());

describe('ResetPasswordPage', () => {
  test('shows invalid link message when no token in URL', () => {
    renderWithToken(null);
    expect(screen.getByText(/invalid link/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
  });

  test('renders password form when token is present', () => {
    renderWithToken('valid-token-abc123');
    expect(screen.getByText(/set new password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New password (min. 8 characters)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
  });

  test('shows error when passwords do not match', async () => {
    renderWithToken('valid-token-abc123');
    fireEvent.change(screen.getByPlaceholderText('New password (min. 8 characters)'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'different456' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() =>
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    );
  });

  test('shows error when password is too short', async () => {
    renderWithToken('valid-token-abc123');
    fireEvent.change(screen.getByPlaceholderText('New password (min. 8 characters)'), { target: { value: 'short' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() =>
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    );
  });

  test('successful reset shows success message', async () => {
    axiosInstance.post.mockResolvedValueOnce({ data: {} });
    renderWithToken('valid-token-abc123');

    fireEvent.change(screen.getByPlaceholderText('New password (min. 8 characters)'), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'newpassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() =>
      expect(screen.getByText(/reset successfully/i)).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument();
  });

  test('expired or invalid token shows error message', async () => {
    axiosInstance.post.mockRejectedValueOnce({
      response: { data: { message: 'Reset link is invalid or has expired' } },
    });
    renderWithToken('expired-token');

    fireEvent.change(screen.getByPlaceholderText('New password (min. 8 characters)'), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'newpassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument()
    );
  });
});
