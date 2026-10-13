import { useFeatureSupport } from "@canva/app-hooks";
import { addElementAtPoint } from "@canva/design";
import type { Feature } from "@canva/platform";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { App } from "src/intents/design_editor/app";
import { renderInTestProvider } from "src/utils/test_render";
import { canvaApiRequest } from "src/lib/api";

jest.mock("@canva/app-hooks");
jest.mock("src/lib/api");

// This test demonstrates how to test code that uses functions from the Canva Apps SDK
// For more information on testing with the Canva Apps SDK, see https://www.canva.dev/docs/apps/testing/
describe("Lucky Store product panel", () => {
  const mockIsSupported = jest.fn();
  const mockUseFeatureSupport = jest.mocked(useFeatureSupport);
  const mockCanvaApiRequest = jest.mocked(canvaApiRequest);

  beforeEach(() => {
    jest.resetAllMocks();
    mockIsSupported.mockImplementation(
      (fn: Feature) => fn === addElementAtPoint,
    );
    mockUseFeatureSupport.mockReturnValue(mockIsSupported);
    mockCanvaApiRequest.mockReturnValue(new Promise(() => undefined));
  });

  it("inserts the selected product name and price into the design", async () => {
    // assert that the mocks are in the expected clean state
    expect(mockUseFeatureSupport).not.toHaveBeenCalled();
    expect(addElementAtPoint).not.toHaveBeenCalled();

    mockCanvaApiRequest.mockResolvedValue({
      products: [
        {
          id: "p1",
          name: "Silk Scarf",
          price: 1250,
          image_url: null,
          sku: "SCARF-1",
        },
      ],
    });
    renderInTestProvider(<App />);
    await screen.findByRole("button", { name: /Silk Scarf/ });

    // the hook should have been called in the render process but not the callback
    expect(mockUseFeatureSupport).toHaveBeenCalled();
    expect(addElementAtPoint).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Silk Scarf/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Insert selected product" }),
    );
    await waitFor(() => {
      expect(
        screen.getByText("Inserted Silk Scarf into the design."),
      ).toBeTruthy();
    });

    // we expect that addElementAtPoint has been called by the button's click handler
    expect(mockIsSupported).toHaveBeenCalledWith(addElementAtPoint);
    expect(addElementAtPoint).toHaveBeenCalledWith({
      type: "text",
      children: ["Silk Scarf\nBDT 1250.00"],
    });
  });

  it("does not allow insertion when catalog authorization fails", async () => {
    mockCanvaApiRequest.mockRejectedValue(new Error("Not authorized"));
    renderInTestProvider(<App />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Not authorized",
    );
    expect(
      screen
        .getByRole("button", { name: "Insert selected product" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
    expect(addElementAtPoint).not.toHaveBeenCalled();
  });
});
