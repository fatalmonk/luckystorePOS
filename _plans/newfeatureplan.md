Thanks for sharing the README! That gives me the exact context I need. It looks like you are working with the **Lucky Store POS** architecture, which uses a highly modern stack: **React 19, TypeScript, Tailwind CSS, Zod**, and **Supabase (Deno Edge Functions)** for the backend.

Since your project already has a dedicated edge function for this (`import-inventory`), we can tailor the Antigravity IDE prompts to integrate seamlessly into your existing monorepo structure.

Here are the refined, stack-specific prompts to copy and paste into your AI IDE:

### Phase 1: Frontend (React + Vite + Tailwind)

#### Prompt 1: Building the UI Shell & Layout

> **Prompt:** "I am working in a React 19 + TypeScript + Vite project using Tailwind CSS. Create a new component `ImportItems.tsx`. The layout should be a white card container with a two-column grid. The left column needs a 3-step vertical list: '1. Download the file & Fill Data' (with a download button), '2. Review & Adjust Data', and '3. Confirm & Import'. The right column should feature a prominent drag-and-drop file upload zone. Use `lucide-react` for a cloud upload icon. Add the text 'Click to Upload or drag and drop', and subtext 'Only excel file up to 500 entries & 1MB is supported'. Ensure the grid stacks on mobile."

#### Prompt 2: Drag-and-Drop & File Validation

> **Prompt:** "Update the `ImportItems.tsx` component to include file upload logic using `react-dropzone`. Add validation logic to reject files larger than 1MB and files that are not `.xlsx` or `.xls`. Use a toast notification to show an error if the file is rejected. Store the accepted `File` object in a React state variable."

#### Prompt 3: Parsing the Excel File (Client-Side)

> **Prompt:** "Integrate the `xlsx` library to parse the uploaded Excel file. When a valid file is dropped, read it and convert the first sheet into a JSON array of objects. Define a TypeScript interface for the expected row data. Add a check: if the array length exceeds 500 rows, show a toast error and clear the state. Otherwise, save the parsed JSON data into a state variable called `importedData`."

#### Prompt 4: The Editable Review Data Grid

> **Prompt:** "Create a new child component `ImportReviewGrid.tsx` that renders conditionally when `importedData` has items (fulfilling Step 2). Display the parsed data in a table. Use `zod` to validate the rows (e.g., ensuring 'Item Name' and 'Sales Price' exist). Highlight any rows with validation errors in red. Allow the user to edit the cells directly in the table to fix these errors. Include a 'Confirm & Import' button that remains disabled until all `zod` validation errors are resolved."

---

### Phase 2: Backend (Supabase Deno Edge Functions)

*Note: Your README mentions you already have an `import-inventory` edge function. This prompt tells the AI to update or build out its logic.*

#### Prompt 5: Supabase Bulk Insert Logic

> **Prompt:** "I am using Supabase with Deno Edge Functions. Write the code for an edge function located at `supabase/functions/import-inventory/index.ts`. It should receive a POST request containing an array of validated inventory objects. The function must:
> 1. Extract the user's JWT to ensure tenant isolation (using the Supabase auth context).
> 2. Validate the incoming payload.
> 3. Perform a bulk insert into the `products` (or `inventory`) table.
> 4. If an item doesn't have a barcode, auto-generate an EAN-13 barcode for it.
> 5. Return a success response with the count of inserted rows. Ensure proper CORS headers are included."
> 
> 

---

To make the data parsing in Prompt 3 perfectly accurate, **what specific required columns or fields exist in your Supabase database for an inventory item (e.g., `product_name`, `sales_price`, `category_id`)?**