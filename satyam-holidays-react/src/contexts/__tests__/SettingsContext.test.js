import { useSettings, useSetting, SettingsProvider } from "../SettingsContext";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// Mock fetch
global.fetch = jest.fn();

// Test component to access hooks
const TestComponent = ({ settingKey }) => {
  const { settings, loading, error } = useSettings();
  const value = useSetting(settingKey);

  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "loaded"}</div>
      <div data-testid="error">{error || "no-error"}</div>
      <div data-testid="value">{typeof value === "object" ? JSON.stringify(value) : value}</div>
      <div data-testid="settings">{JSON.stringify(settings)}</div>
    </div>
  );
};

const renderWithProvider = (settingKey = "company.name") => {
  return render(
    <SettingsProvider>
      <TestComponent settingKey={settingKey} />
    </SettingsProvider>
  );
};

describe("SettingsContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("provides fallback values while loading", () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProvider();

    expect(screen.getByTestId("loading")).toHaveTextContent("loading");
    expect(screen.getByTestId("value")).toHaveTextContent("Satyam Holidays");
  });

  it("uses fallback values when fetch fails", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("value")).toHaveTextContent("Satyam Holidays");
    expect(screen.getByTestId("error")).toHaveTextContent("Network error");
  });

  it("updates settings when fetch succeeds", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          "company.name": "Custom Company",
          "company.email": "custom@example.com",
        },
      }),
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("value")).toHaveTextContent("Custom Company");
    expect(screen.getByTestId("error")).toHaveTextContent("no-error");
  });

  it("useSetting returns fallback for missing keys", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {},
      }),
    });

    renderWithProvider("company.name");

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    // Should use fallback since API returned empty data
    expect(screen.getByTestId("value")).toHaveTextContent("Satyam Holidays");
  });

  it("handles non-ok response", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("error")).toHaveTextContent("Failed to fetch settings: 500");
  });
});
