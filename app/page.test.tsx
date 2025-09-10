import { render, screen } from '@testing-library/react';
import Dashboard from './page';

describe('Dashboard', () => {
    it('renders dashboard heading', () => {
        render(<Dashboard />);
        expect(screen.getByText('Welcome to the Tutorium Dashboard')).toBeInTheDocument();
    });
});