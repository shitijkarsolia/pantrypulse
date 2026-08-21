import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { App } from '../../src/App';

test('renders the PantryPulse brand in an accessible main landmark', () => {
  render(createElement(App));

  expect(screen.getByRole('heading', { name: 'PantryPulse' })).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
});
