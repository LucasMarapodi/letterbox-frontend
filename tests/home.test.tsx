import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from '../src/App';

test('a página inicial apresenta um título acessível', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Game Reviews', level: 1 })).toBeVisible();
});
