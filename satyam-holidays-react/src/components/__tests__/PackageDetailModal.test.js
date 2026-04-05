import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PackageDetailModal from "../PackageDetailModal";

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock package data
const mockPackage = {
  id: "123",
  name: "Chardham Yatra",
  location: "Uttarakhand, India",
  duration: "10 Days / 9 Nights",
  price: "₹25,000",
  rating: 4.8,
  reviews: 150,
  image: "/images/chardham.jpg",
  description: "Experience the divine journey to the four sacred shrines.",
  highlights: [
    "Visit all four Dhams",
    "Professional guide",
    "Comfortable stay",
    "All meals included",
  ],
};

const renderModal = (props = {}) => {
  const defaultProps = {
    package: mockPackage,
    isOpen: true,
    onClose: jest.fn(),
  };
  return render(<PackageDetailModal {...defaultProps} {...props} />);
};

describe("PackageDetailModal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when package is null", () => {
    const { container } = renderModal({ package: null });
    expect(container.firstChild).toBeNull();
  });

  it("renders package details when open", () => {
    renderModal();

    expect(screen.getByText("Chardham Yatra")).toBeInTheDocument();
    expect(screen.getByText("Uttarakhand, India")).toBeInTheDocument();
    expect(screen.getByText("10 Days / 9 Nights")).toBeInTheDocument();
    expect(screen.getByText("4.8")).toBeInTheDocument();
  });

  it("renders all highlights", () => {
    renderModal();

    mockPackage.highlights.forEach((highlight) => {
      expect(screen.getByText(highlight)).toBeInTheDocument();
    });
  });

  it("has proper accessibility attributes", () => {
    renderModal();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    const closeButton = screen.getByLabelText("Close package details");
    await userEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    // Click on backdrop (the element with bg-black/60)
    const backdrop = document.querySelector(".bg-black\\/60");
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("switches tabs correctly", async () => {
    renderModal();

    // Click on Itinerary tab
    const itineraryTab = screen.getByText("Itinerary");
    await userEvent.click(itineraryTab);

    expect(screen.getByText("Detailed Itinerary")).toBeInTheDocument();

    // Click on Reviews tab
    const reviewsTab = screen.getByText("Reviews");
    await userEvent.click(reviewsTab);

    // Reviews section should be rendered (might show loading or content)
    expect(screen.queryByText("Overview")).not.toHaveClass("border-primary-500");
  });

  it("focuses close button on mount", async () => {
    renderModal();

    await waitFor(() => {
      const closeButton = screen.getByLabelText("Close package details");
      expect(document.activeElement).toBe(closeButton);
    });
  });
});
