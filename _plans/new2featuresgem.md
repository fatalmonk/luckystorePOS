Here are the meta-level architectural prompts designed for Antigravity IDE (or similar AI coding assistants). Because you are working in a modern, typed monorepo (React 19, TypeScript, Tailwind, Supabase), these prompts are structured to command the AI to handle database migrations, UI components, and routing sequentially.

Copy and paste these into your IDE one feature at a time.

---

### Phase 1: Feature Implementation Prompts

#### 1. Centralized "Import Data" Hub

> **Prompt:** "We need to create a centralized 'Import Data' hub in our React 19 + TypeScript admin web app, similar to the Karbar app.
> **Step 1: Routing & Sidebar:** Add a new expandable section in the sidebar called 'Data Management' with child routes `/admin/import/products` and `/admin/import/parties`.
> **Step 2: Shared UI Component:** Create a highly reusable `ImportWizard.tsx` component that takes props for `title`, `sampleFileUrl`, `validationSchema` (Zod), and `onImportSubmit`. It should have the 3-step UI: '1. Download Sample', '2. Review & Adjust' (editable data grid), and '3. Confirm & Import' (with a drag-and-drop zone).
> **Step 3: Implementation:** Implement the `/admin/import/parties` page using this shared component. Use the `xlsx` library to parse the file on the client side, validate it against a Zod schema for Suppliers/Customers, and write the edge function payload logic to send the batch to our Supabase backend."

#### 2. "Other Income" Ledger Module

> **Prompt:** "We are adding an 'Other Income' module to track non-sales revenue (e.g., display fees, recycling).
> **Step 1: Supabase DB:** Generate a Supabase SQL migration to create an `other_income` table. It needs `id`, `tenant_id`, `date`, `category` (enum: 'Display Fee', 'Delivery', 'Miscellaneous'), `amount`, `payment_method` (Cash, bKash, Bank), and `notes`. Include RLS policies restricting access by `tenant_id`.
> **Step 2: Backend:** Write the Deno edge function or Supabase RPC to insert these records safely. Update the existing 'Total Balance (Cash & Bank)' calculation RPC to include this `other_income` sum.
> **Step 3: Frontend:** Create a new page `/admin/other-income`. Build a clean UI with a Tailwind data table showing recent income, a 'Record Income' modal with a `react-hook-form` (using Zod validation), and a summary card at the top showing 'Total Other Income This Month'."

#### 3. "Manage Staffs" Dashboard

> **Prompt:** "We need a 'Manage Staff' dashboard for store owners. Our app already uses a backend PIN Auth system (`authenticate_staff_pin` RPC).
> **Step 1: Frontend UI:** Create a page at `/admin/staff`. Build a grid view using Tailwind displaying staff cards (Name, Role, Status).
> **Step 2: PIN Management:** Add a secure modal that allows the Admin user to reset or assign a new 4-digit PIN for a staff member. This should call a Supabase RPC to update the PIN securely.
> **Step 3: Performance Metrics:** Add a query using TanStack Query to fetch and display 'Sales processed today' for each staff member, pulling from the `sales` table where `staff_id` matches, so the owner can see who is performing best."

#### 4. In-App User Education (Help & Tutorials)

> **Prompt:** "To improve onboarding, create an 'In-App Education' module.
> **Step 1: Sidebar:** Add a 'Help & Support' section at the bottom of the sidebar.
> **Step 2: Tutorials Page:** Create `/admin/tutorials`. Build a responsive grid of video thumbnail cards (e.g., 'How to connect Bluetooth Printer', 'How to process bKash'). Clicking a card should open a modal with an embedded video player or a step-by-step markdown renderer.
> **Step 3: What's New Widget:** Build a small `ChangelogModal.tsx` component that reads from a local `changelog.json` file. It should pop up automatically once when the user logs in after a new version bump (e.g., v1.0.0 to v1.1.0), highlighting new features."

---

### Phase 2: App Polishing Recommendations & Prompts

Based on the [Lucky Store POS dashboard](https://www.google.com/search?q=http://localhost:5173/admin) screenshot provided in the context, your dashboard is incredibly data-rich, but it is bordering on "information overload." Here are the exact polishing prompts to clean it up.

#### Polish 1: Consolidate the Sidebar Navigation

Your current sidebar has 14+ visible links flatly listed under headings. As you add features (like Import, Staff, and Tutorials), it will become overwhelming.

> **Prompt:** "Refactor our existing Sidebar navigation component. We have too many flat links. Group them into collapsible accordions (using Lucide icons for visual cues).
> * **Business:** Dashboard, Quick POS, Competitor Prices.
> * **Inventory & Sales:** Products, Inventory, Purchase, Sales.
> * **Finance:** Expenses, Supplier Ledger, Customer Ledger, Collections, Other Income.
> * **Management:** Reports, Manage Staff, Import Data.
> * **System:** Settings, Help & Tutorials.
> Ensure the active route keeps its parent accordion open automatically."
> 
> 

#### Polish 2: Dashboard De-cluttering via Tabs

You currently show Revenue Breakdown, Expense Breakdown, Investment Summary, Low Stock Alerts, Recent Activity, and a Cashflow chart all on one massive scrollable page.

> **Prompt:** "Refactor the main Admin Dashboard page (`/admin`). The page currently has too many metric widgets stacking vertically.
> Keep the top row of KPI cards (Sales, Purchase, Expense, To Receive, To Give, Total Balance) permanently visible.
> Below that, implement a Tabbed interface using Tailwind (e.g., `radix-ui/react-tabs` if available, or custom state).
> * **Tab 1: 'Overview'** (Cashflow Chart & Recent Activity)
> * **Tab 2: 'Financials'** (Revenue Breakdown, Expense Breakdown, Investment Summary)
> * **Tab 3: 'Operations'** (Low Stock Alerts, Upcoming Reminders).
> This will drastically reduce cognitive load for the store manager."
> 
> 

---

Are you planning to tackle the Database/Backend changes first (like the `other_income` migration), or do you prefer to build the Frontend UI shells first and wire them up later?