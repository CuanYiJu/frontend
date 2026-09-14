import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './Login';
import { jsonResponse, renderAt, stubFetch } from '../test/helpers';

const session = {
  loading: false,
  user: null as { id: string; email: string } | null,
  profile: null,
  isAdmin: false,
  pendingRequests: 0,
  refresh: vi.fn(async () => {}),
  setProfile: vi.fn(),
  logout: vi.fn(async () => {}),
};
vi.mock('../session', () => ({ useSession: () => session }));

beforeEach(() => {
  session.user = null;
  session.refresh.mockClear();
  vi.stubGlobal('location', { ...window.location, assign: vi.fn() });
});

describe('LoginPage', () => {
  test('sends the email, then shows the 6-digit code step and logs in with it', async () => {
    const { calls } = stubFetch({
      'POST /auth/magic-link': jsonResponse({ status: 'sent', email: 'me@example.com' }, 202),
      'POST /auth/verify-code': jsonResponse({ status: 'ok', redirectTo: '/onboarding', isNew: true }),
    });
    renderAt(<LoginPage />, '/login?next=/events/1');
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox'), 'me@example.com');
    await user.click(screen.getByRole('button', { name: '发送登录邮件' }));

    expect(await screen.findByText(/邮件已发到/)).toBeInTheDocument();
    const code = screen.getByRole('textbox');
    expect(code).toHaveAttribute('inputmode', 'numeric');
    await user.type(code, '12 34 56'); // non-digits stripped, 6 max
    expect(code).toHaveValue('123456');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(calls[1]).toMatchObject({ path: '/auth/verify-code', body: { email: 'me@example.com', code: '123456', next: '/events/1' } });
    expect(session.refresh).toHaveBeenCalled();
    expect(window.location.assign).toHaveBeenCalledWith('/onboarding');
  });

  test('a wrong code shows the server message and keeps the code step', async () => {
    stubFetch({
      'POST /auth/magic-link': jsonResponse({ status: 'sent', email: 'me@example.com' }, 202),
      'POST /auth/verify-code': jsonResponse({ status: 'invalid', message: '链接或验证码无效' }, 400),
    });
    renderAt(<LoginPage />, '/login');
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), 'me@example.com');
    await user.click(screen.getByRole('button', { name: '发送登录邮件' }));
    await user.type(await screen.findByRole('textbox'), '000000');
    await user.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('链接或验证码无效');
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  test('rate limiting on send is shown and the email step stays', async () => {
    stubFetch({ 'POST /auth/magic-link': jsonResponse({ status: 'rate_limited', message: '操作太频繁，请稍后再试。' }, 429) });
    renderAt(<LoginPage />, '/login');
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), 'me@example.com');
    await user.click(screen.getByRole('button', { name: '发送登录邮件' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('操作太频繁');
    expect(screen.getByRole('button', { name: '发送登录邮件' })).toBeInTheDocument();
  });

  test('already logged in → leaves the login page', async () => {
    session.user = { id: 'u1', email: 'me@example.com' };
    renderAt(<LoginPage />, '/login');
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });
});
