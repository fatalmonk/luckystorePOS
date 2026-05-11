import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Drawer } from './Drawer';

const meta = {
  title: 'Components/Drawer',
  component: Drawer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
A modal drawer that slides in from the right side of the screen.

**Features:**
- Keyboard accessible (Escape to close)
- Focus trap to keep navigation within drawer
- Click outside to close (optional)
- Proper ARIA attributes for screen readers
- Smooth animations

**When to use:**
- Secondary actions that don't require leaving the current page
- Quick views of related information
- Forms that need more space than a dialog but less than a full page
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls whether the drawer is open',
    },
    onClose: {
      description: 'Callback when drawer should close',
    },
    title: {
      control: 'text',
      description: 'Drawer title (optional)',
    },
    children: {
      description: 'Drawer content',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
    preventOutsideClose: {
      control: 'boolean',
      description: 'Prevent clicking outside to close',
      defaultValue: false,
    },
  },
  args: {
    onClose: fn(),
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic example with simple content
export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Drawer Title',
    children: (
      <div className="space-y-4">
        <p className="text-text-secondary">
          This is a basic drawer with simple content.
        </p>
        <p className="text-text-secondary">
          Press <kbd className="px-2 py-1 bg-background-subtle rounded text-xs">Esc</kbd> to close, or click the × button.
        </p>
      </div>
    ),
  },
};

// Form drawer example
export const WithForm: Story = {
  args: {
    isOpen: true,
    title: 'Add Product',
    children: (
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="product-name" className="block text-sm font-medium text-text-secondary mb-1">
            Product Name
          </label>
          <input
            id="product-name"
            type="text"
            className="w-full px-3 py-2 border border-border-default rounded-md bg-surface-default text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent"
            placeholder="Enter product name"
          />
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-text-secondary mb-1">
            Price (৳)
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            className="w-full px-3 py-2 border border-border-default rounded-md bg-surface-default text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-1">
            Category
          </label>
          <select
            id="category"
            className="w-full px-3 py-2 border border-border-default rounded-md bg-surface-default text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent"
          >
            <option value="">Select a category</option>
            <option value="groceries">Groceries</option>
            <option value="beverages">Beverages</option>
            <option value="snacks">Snacks</option>
            <option value="household">Household</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            className="flex-1 px-4 py-2 border border-border-default rounded-md text-text-secondary hover:bg-background-subtle transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-primary-default text-primary-on rounded-md font-medium hover:bg-primary-hover transition-colors"
          >
            Add Product
          </button>
        </div>
      </form>
    ),
  },
};

// Long content with scrolling
export const WithScrollingContent: Story = {
  args: {
    isOpen: true,
    title: 'Product Details',
    children: (
      <div className="space-y-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="p-3 bg-background-subtle rounded-md">
            <h4 className="font-medium text-text-primary">Section {i + 1}</h4>
            <p className="text-sm text-text-secondary mt-1">
              This is some content for section {i + 1}. The drawer should scroll when content overflows.
            </p>
          </div>
        ))}
      </div>
    ),
  },
};

// Critical form that shouldn't close accidentally
export const PreventOutsideClose: Story = {
  args: {
    isOpen: true,
    title: 'Confirm Payment',
    preventOutsideClose: true,
    children: (
      <div className="space-y-4">
        <div className="p-4 bg-warning-subtle border border-warning-default rounded-md">
          <p className="text-warning-dark font-medium">
            ⚠️ This action cannot be undone
          </p>
          <p className="text-sm text-text-secondary mt-1">
            Please complete the payment process. You cannot close this drawer by clicking outside.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Amount:</span>
            <span className="font-semibold text-text-primary">৳1,250.00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Payment Method:</span>
            <span className="font-medium text-text-primary">Bkash</span>
          </div>
        </div>

        <button className="w-full py-3 bg-primary-default text-primary-on font-semibold rounded-md hover:bg-primary-hover transition-colors">
          Confirm Payment
        </button>
      </div>
    ),
  },
};

// Empty state example
export const WithEmptyState: Story = {
  args: {
    isOpen: true,
    title: 'Notifications',
    children: (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-background-subtle rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <h3 className="text-text-primary font-medium">No notifications</h3>
        <p className="text-text-secondary text-sm mt-1">
          You're all caught up! Check back later.
        </p>
      </div>
    ),
  },
};

// Without title
export const WithoutTitle: Story = {
  args: {
    isOpen: true,
    title: undefined,
    children: (
      <div className="space-y-4">
        <p className="text-text-secondary">
          This drawer has no title, just content.
        </p>
        <div className="p-4 bg-background-subtle rounded-md">
          <p className="text-sm text-text-primary">
            Useful for simple confirmations or when the content is self-explanatory.
          </p>
        </div>
      </div>
    ),
  },
};
