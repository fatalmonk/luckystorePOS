import { useFeatureSupport } from "@canva/app-hooks";
import { addElementAtCursor, addElementAtPoint } from "@canva/design";
import type { Feature } from "@canva/platform";
import { requestOpenExternalUrl } from "@canva/platform";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { App, DOCS_URL } from "src/intents/design_editor/app";
import { renderInTestProvider } from "src/utils/test_render";
import { canvaApiRequest } from "src/lib/api";

jest.mock("@canva/app-hooks");
jest.mock("src/lib/api");

// This test demonstrates how to test code that uses functions from the Canva Apps SDK
// For more information on testing with the Canva Apps SDK, see https://www.canva.dev/docs/apps/testing/
describe("Lucky Store product panel", () => {
  const mockIsSupported = jest.fn();
  const mockUseFeatureSupport = jest.mocked(useFeatureSupport);
  const mockRequestOpenExternalUrl = jest.mocked(requestOpenExternalUrl);
  const mockCanvaApiRequest = jest.mocked(canvaApiRequest);

  beforeEach(() => {
    jest.resetAllMocks();
    mockIsSupported.mockImplementation(
      (fn: Feature) => fn === addElementAtPoint,
    );
    mockUseFeatureSupport.mockReturnValue(mockIsSupported);
    mockRequestOpenExternalUrl.mockResolvedValue({ status: "completed" });
    mockCanvaApiRequest.mockReturnValue(new Promise(() => undefined));
  });

  it("inserts the selected product name and price into the design", async () => {
    // assert that the mocks are in the expected clean state
    expect(mockUseFeatureSupport).not.toHaveBeenCalled();
    expect(addElementAtPoint).not.toHaveBeenCalled();

    mockCanvaApiRequest.mockResolvedValue({
      products: [{ id: "p1", name: "Silk Scarf", price: 1250, image_url: null, sku: "SCARF-1" }],
    });
    renderInTestProvider(<App />);
    await screen.findByRole("button", { name: /Silk Scarf/ });

    // the hook should have been called in the render process but not the callback
    expect(mockUseFeatureSupport).toHaveBeenCalled();
    expect(addElementAtPoint).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Silk Scarf/ }));
    fireEvent.click(screen.getByRole("button", { name: "Insert selected product" }));
    await waitFor(() => {
      expect(screen.getByText("Inserted Silk Scarf into the design.")).toBeTruthy();
    });

    // we expect that addElementAtPoint has been called by the button's click handler
    expect(mockIsSupported).toHaveBeenCalledWith(addElementAtPoint);
    expect(mockIsSupported).not.toHaveBeenCalledWith(addElementAtCursor);
    expect(addElementAtPoint).toHaveBeenCalledWith({
      type: "text",
      children: ["Silk Scarf\nBDT 1250.00"],
    });
  });

  // this test uses a mock in place of the @canva/platform requestOpenExternalUrl function
  it("should call `requestOpenExternalUrl` when the button is clicked", () => {
    expect(mockRequestOpenExternalUrl).not.toHaveBeenCalled();

    renderInTestProvider(<App />);

    // get a reference to the Apps SDK button by name
    const sdkButton = screen.getByRole("button", {
      name: "Open Canva Apps SDK docs",
    });

    expect(mockRequestOpenExternalUrl).not.toHaveBeenCalled();
    fireEvent.click(sdkButton);
    expect(mockRequestOpenExternalUrl).toHaveBeenCalled();

    // assert that the requestOpenExternalUrl function was called with the expected arguments
    expect(mockRequestOpenExternalUrl.mock.calls[0]?.[0]).toEqual({
      url: DOCS_URL,
    });
  });
});
