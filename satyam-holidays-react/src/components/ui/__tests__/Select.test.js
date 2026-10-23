import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Select from "../Select";

const OPTIONS = [
  { value: "", label: "Anywhere" },
  { value: "domestic", label: "Within India" },
  { value: "international", label: "International" },
];

const Harness = ({ onChange = () => {} }) => {
  const [value, setValue] = useState("");
  return (
    <Select
      aria-label="Trip type"
      value={value}
      options={OPTIONS}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
};

describe("Select", () => {
  it("opens on click and picks an option", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    const trigger = screen.getByRole("combobox", { name: "Trip type" });
    expect(trigger).toHaveTextContent("Anywhere");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("option", { name: "International" }));

    expect(onChange).toHaveBeenCalledWith("international");
    expect(trigger).toHaveTextContent("International");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports arrow keys, Enter and Escape", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    const trigger = screen.getByRole("combobox");

    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // opens on current value
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // → Within India
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("domestic");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("jumps to an option by typing while closed", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "i" });
    expect(onChange).toHaveBeenCalledWith("international");
  });

  it("marks the selected option", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "Anywhere" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});
