import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { EventCard, Seats, StatusBadge } from './EventCard';
import { event } from '../test/helpers';

describe('StatusBadge picks one label in priority order', () => {
  const badge = (over: Parameters<typeof event>[0]) => {
    const { container } = render(<StatusBadge event={event(over)} />);
    return container.textContent;
  };

  test('cancelled beats everything', () => {
    expect(badge({ status: 'cancelled', isPast: true, isHost: true, myStatus: 'confirmed' })).toBe('已取消');
  });
  test('past', () => expect(badge({ isPast: true, myStatus: 'confirmed' })).toBe('已结束'));
  test('host', () => expect(badge({ isHost: true, myStatus: 'confirmed' })).toBe('我组的'));
  test('confirmed / waitlisted', () => {
    expect(badge({ myStatus: 'confirmed' })).toBe('已报名');
    expect(badge({ myStatus: 'waitlisted' })).toBe('候补中');
  });
  test('full only when not joined', () => {
    expect(badge({ confirmedCount: 4, capacity: 4 })).toBe('已满员');
    expect(badge({ confirmedCount: 4, capacity: 4, myStatus: 'confirmed' })).toBe('已报名');
  });
  test('withdrawn or removed shows nothing special', () => {
    expect(badge({ myStatus: 'withdrawn' })).toBe('');
    expect(badge({ myStatus: 'removed', confirmedCount: 2 })).toBe('');
  });
});

describe('Seats', () => {
  test('shows confirmed/capacity and the waitlist only when non-empty', () => {
    const { container, rerender } = render(<Seats event={event({ confirmedCount: 3, capacity: 5 })} />);
    expect(container.textContent).toBe('3/5 人');
    expect(container.firstChild).not.toHaveClass('full');
    rerender(<Seats event={event({ confirmedCount: 5, capacity: 5, waitlistCount: 2 })} />);
    expect(container.textContent).toBe('5/5 人 · 候补 2');
    expect(container.firstChild).toHaveClass('full');
  });
});

describe('EventCard', () => {
  test('links to the event and shows kind, host, place and games', () => {
    render(
      <MemoryRouter>
        <EventCard event={event({ id: 'abc', kind: 'regular', games: '璀璨宝石' })} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/events/abc');
    expect(screen.getByText('固定局')).toBeInTheDocument();
    expect(screen.getByText('局长 组局')).toBeInTheDocument();
    expect(screen.getByText(/北约克/)).toBeInTheDocument();
    expect(screen.getByText(/璀璨宝石/)).toBeInTheDocument();
    expect(screen.getByText(/明天/)).toBeInTheDocument();
  });

  test('past events are dimmed', () => {
    render(
      <MemoryRouter>
        <EventCard event={event({ isPast: true })} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link')).toHaveClass('dim');
  });
});
