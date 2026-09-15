import { describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from './Home';
import { event, jsonResponse, renderAt, stubFetch } from '../test/helpers';

vi.mock('../session', () => ({
  useSession: () => ({ loading: false, user: { id: 'u1', email: 'me@example.com' }, profile: null, isAdmin: false, pendingRequests: 0, refresh: vi.fn(), setProfile: vi.fn(), logout: vi.fn() }),
}));

describe('HomePage search', () => {
  test('typing searches after a pause, results replace the tabs, clearing restores the list', async () => {
    const { calls } = stubFetch({
      'GET /api/events': jsonResponse({ events: [event({ id: 'l1', title: '列表里的局' })] }),
      'GET /api/events/search': (init) => {
        void init;
        return jsonResponse({ events: [event({ id: 's1', title: '搜到的卡坦' }), event({ id: 's2', title: '去年的卡坦', isPast: true, myStatus: 'confirmed' })] });
      },
    });
    renderAt(<HomePage />, '/');
    expect(await screen.findByText('列表里的局')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '即将开始' })).toBeInTheDocument();

    const user = userEvent.setup();
    const box = screen.getByRole('searchbox', { name: '搜索局' });
    await user.type(box, '卡坦');
    // Not yet: debounced.
    expect(calls.some((c) => c.path.startsWith('/api/events/search'))).toBe(false);

    expect(await screen.findByText('搜到的卡坦')).toBeInTheDocument();
    expect(calls.find((c) => c.path.startsWith('/api/events/search'))?.path).toBe('/api/events/search?q=%E5%8D%A1%E5%9D%A6');
    expect(screen.queryByRole('tab', { name: '即将开始' })).not.toBeInTheDocument();
    expect(screen.getByText(/搜到 2 个局/)).toBeInTheDocument();
    expect(screen.getByText(/已结束的局只显示你参加过的/)).toBeInTheDocument();
    // History is grouped under its own heading.
    expect(screen.getByRole('heading', { name: /已结束/ })).toBeInTheDocument();
    expect(screen.getByText('去年的卡坦')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '清除搜索' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: '即将开始' })).toBeInTheDocument());
    expect(await screen.findByText('列表里的局')).toBeInTheDocument();
  });

  test('an empty result says so with the query', async () => {
    stubFetch({
      'GET /api/events': jsonResponse({ events: [] }),
      'GET /api/events/search': jsonResponse({ events: [] }),
    });
    renderAt(<HomePage />, '/?q=%E4%B8%8D%E5%AD%98%E5%9C%A8');
    expect(await screen.findByText(/没有找到「不存在」相关的局/)).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '搜索局' })).toHaveValue('不存在');
  });
});
