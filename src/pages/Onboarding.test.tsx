import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingPage } from './Onboarding';
import { jsonResponse, profile, renderAt, stubFetch } from '../test/helpers';
import type { Profile } from '../api';

// The page reads login state from useSession(); stub it so no provider or
// network is needed. Each test sets `session` before rendering.
const session = {
  loading: false,
  user: { id: 'u1', email: 'me@example.com' },
  profile: null as Profile | null,
  isAdmin: false,
  pendingRequests: 0,
  refresh: vi.fn(async () => {}),
  setProfile: vi.fn(),
  logout: vi.fn(async () => {}),
};
vi.mock('../session', () => ({ useSession: () => session }));

beforeEach(() => {
  session.profile = null;
  session.isAdmin = false;
  session.setProfile.mockClear();
  session.refresh.mockClear();
});

describe('first visit', () => {
  test('shows the form, prefills the nickname from the WeChat name, submits both', async () => {
    const { calls } = stubFetch({
      'PUT /api/profile': jsonResponse({ profile: profile({ nickname: '小明🎲', wechatName: '小明🎲' }) }, 201),
    });
    renderAt(<OnboardingPage />, '/onboarding');
    expect(screen.getByRole('heading', { name: '完善资料' })).toBeInTheDocument();
    expect(screen.getByText(/对不上会交给群主审核/)).toBeInTheDocument();

    const user = userEvent.setup();
    const [wechat, nickname] = screen.getAllByRole('textbox');
    await user.type(wechat!, '小明🎲');
    expect(nickname).toHaveValue('小明🎲');
    await user.click(screen.getByRole('button', { name: '进入桌游群' }));

    expect(calls[0]).toMatchObject({ method: 'PUT', path: '/api/profile', body: { nickname: '小明🎲', wechatName: '小明🎲' } });
    expect(session.setProfile).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
    // Active → navigated away from onboarding.
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  test('admins get the admin hint', () => {
    session.isAdmin = true;
    renderAt(<OnboardingPage />, '/onboarding');
    expect(screen.getByText(/你是群主，直接填就行/)).toBeInTheDocument();
  });

  test('a server error is shown and the form stays', async () => {
    stubFetch({ 'PUT /api/profile': jsonResponse({ error: 'validation', message: '昵称 2–20 个字。' }, 400) });
    renderAt(<OnboardingPage />, '/onboarding');
    const user = userEvent.setup();
    await user.type(screen.getAllByRole('textbox')[0]!, '小');
    await user.click(screen.getByRole('button', { name: '进入桌游群' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('昵称 2–20 个字。');
    expect(screen.getByRole('heading', { name: '完善资料' })).toBeInTheDocument();
  });
});

describe('waiting for approval', () => {
  test('pending profile shows the waiting card with the submitted name and a refresh button', async () => {
    session.profile = profile({ status: 'pending', wechatName: '路人甲', nickname: '新人' });
    renderAt(<OnboardingPage />, '/onboarding');
    expect(screen.getByRole('heading', { name: '等群主审核' })).toBeInTheDocument();
    expect(screen.getByText(/「路人甲」/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: /刷新看看/ }));
    expect(session.refresh).toHaveBeenCalledTimes(1);
  });

  test('"改名字重新提交" opens the form prefilled and resubmits', async () => {
    session.profile = profile({ status: 'pending', wechatName: '路人甲', nickname: '新人' });
    const { calls } = stubFetch({ 'PUT /api/profile': jsonResponse({ profile: profile({ status: 'pending', wechatName: '路人乙', nickname: '新人' }) }) });
    renderAt(<OnboardingPage />, '/onboarding');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '改名字重新提交' }));
    const [wechat] = screen.getAllByRole('textbox');
    expect(wechat).toHaveValue('路人甲');
    await user.clear(wechat!);
    await user.type(wechat!, '路人乙');
    await user.click(screen.getByRole('button', { name: '重新提交' }));
    expect(calls[0]?.body).toEqual({ nickname: '新人', wechatName: '路人乙' });
    // Still pending → back on the waiting card, not navigated.
    expect(await screen.findByRole('heading', { name: '等群主审核' })).toBeInTheDocument();
  });

  test('rejected profile shows the admin note', () => {
    session.profile = profile({ status: 'rejected', reviewNote: '群里没这个人' });
    renderAt(<OnboardingPage />, '/onboarding');
    expect(screen.getByRole('heading', { name: '申请没有通过' })).toBeInTheDocument();
    expect(screen.getByText(/群里没这个人/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /刷新看看/ })).not.toBeInTheDocument();
  });

  test('active profile is sent on to the next page', async () => {
    session.profile = profile({ status: 'active' });
    renderAt(<OnboardingPage />, '/onboarding?next=/events/1');
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });
});
