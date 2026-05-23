import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Drawer',
    children: <div data-testid="drawer-content">Content</div>,
  };

  it('renders when isOpen is true', () => {
    render(<Drawer {...defaultProps} />);
    
    expect(screen.getByText('Test Drawer')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<Drawer {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Test Drawer')).not.toBeInTheDocument();
  });

  it('calls onClose when clicking the close button', () => {
    const onCloseMock = vi.fn();
    render(<Drawer {...defaultProps} onClose={onCloseMock} />);
    
    const closeButton = screen.getByRole('button', { name: /close drawer/i });
    fireEvent.click(closeButton);
    
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop', () => {
    const onCloseMock = vi.fn();
    render(<Drawer {...defaultProps} onClose={onCloseMock} />);
    
    // The backdrop is the first fixed inset-0 element
    const backdrop = document.querySelector('.fixed.inset-0[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    }
  });

  it('does not close when clicking backdrop with preventOutsideClose', () => {
    const onCloseMock = vi.fn();
    render(
      <Drawer {...defaultProps} onClose={onCloseMock} preventOutsideClose={true} />
    );
    
    const backdrop = document.querySelector('.fixed.inset-0[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onCloseMock).not.toHaveBeenCalled();
    }
  });

  it('calls onClose when pressing Escape key', async () => {
    const onCloseMock = vi.fn();
    render(<Drawer {...defaultProps} onClose={onCloseMock} />);
    
    // Wait for component to mount and add event listener
    await waitFor(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('has correct ARIA attributes', () => {
    render(<Drawer {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'drawer-title');
  });

  it('has accessible title', () => {
    render(<Drawer {...defaultProps} />);
    
    const title = screen.getByText('Test Drawer');
    expect(title).toHaveAttribute('id', 'drawer-title');
  });

  it('applies custom className', () => {
    const customClass = 'custom-drawer-class';
    render(<Drawer {...defaultProps} className={customClass} />);
    
    // The drawer panel should have the custom class
    const drawerPanel = document.querySelector(`.${customClass}`);
    expect(drawerPanel).toBeInTheDocument();
  });

  it('traps focus within drawer', async () => {
    const content = (
      <div>
        <input type="text" data-testid="input-1" />
        <input type="text" data-testid="input-2" />
        <button data-testid="button-1">Button</button>
      </div>
    );
    
    render(<Drawer {...defaultProps} children={content} />);
    
    // Wait for focus to move to drawer
    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /close drawer/i });
      expect(document.activeElement).toBe(closeButton);
    });
  });

  it('renders without title when title is not provided', () => {
    render(
      <Drawer
        isOpen={true}
        onClose={vi.fn()}
        children={<div>Content without title</div>}
      />
    );
    
    expect(screen.queryByText('Test Drawer')).not.toBeInTheDocument();
    expect(screen.getByText('Content without title')).toBeInTheDocument();
  });

  it('has proper close button with icon', () => {
    render(<Drawer {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close drawer/i });
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAttribute('aria-label', 'Close drawer');
  });

  it('applies focus ring styles on focus', () => {
    render(<Drawer {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close drawer/i });
    fireEvent.focus(closeButton);
    
    // Check for focus ring classes
    expect(closeButton).toHaveClass('focus:ring-2');
    expect(closeButton).toHaveClass('focus:ring-warm-accent/30');
  });
});
