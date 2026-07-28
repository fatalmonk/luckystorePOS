interface BrowserLaunchResponse extends Response {
  browser?: unknown;
}

const puppeteer = {
  launch: async (endpoint: Fetcher): Promise<unknown> => {
    if (!endpoint || typeof endpoint.fetch !== "function") {
      throw new TypeError("browser endpoint must expose fetch()");
    }

    const response = (await endpoint.fetch(
      new Request("https://browser-binding.test/launch", { method: "POST" }),
    )) as BrowserLaunchResponse;

    if (!response.browser) {
      throw new Error("fake browser endpoint returned no browser");
    }

    return response.browser;
  },
};

export default puppeteer;
