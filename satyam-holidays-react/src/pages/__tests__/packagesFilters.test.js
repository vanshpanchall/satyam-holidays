import { filterPackages, regionsOf } from "../packagesFilters";

const pkgs = [
  {
    _id: "1",
    name: "Kashmir Paradise",
    location: "Srinagar",
    category: "domestic",
    subcategory: "kashmir",
    numericPrice: 24999,
    duration: "6 Days / 5 Nights",
    rating: 4.6,
  },
  {
    _id: "2",
    name: "Dubai Delight",
    location: "Dubai",
    category: "international",
    subcategory: "dubai",
    numericPrice: 52999,
    duration: "5 Days / 4 Nights",
    rating: 4.8,
  },
  {
    _id: "3",
    name: "Chardham Yatra",
    location: "Uttarakhand",
    category: "domestic",
    subcategory: "chardham",
    numericPrice: 42999,
    duration: "11 Days / 10 Nights",
    rating: 4.4,
    isFeatured: true,
  },
];

describe("filterPackages", () => {
  it("filters by category", () => {
    expect(filterPackages(pkgs, { category: "international" }).map((p) => p._id)).toEqual(["2"]);
  });

  it("matches every search term across name and location", () => {
    expect(filterPackages(pkgs, { q: "dubai delight" })).toHaveLength(1);
    expect(filterPackages(pkgs, { q: "dubai kashmir" })).toHaveLength(0);
  });

  it("filters by budget and trip length", () => {
    expect(
      filterPackages(pkgs, { budget: "20k-50k" })
        .map((p) => p._id)
        .sort()
    ).toEqual(["1", "3"]);
    expect(filterPackages(pkgs, { duration: "long" }).map((p) => p._id)).toEqual(["3"]);
  });

  it("puts featured trips first by default and sorts by price", () => {
    expect(filterPackages(pkgs, {})[0]._id).toBe("3");
    expect(filterPackages(pkgs, { sort: "price-asc" }).map((p) => p._id)).toEqual(["1", "3", "2"]);
  });

  it("lists unique regions", () => {
    expect(regionsOf(pkgs)).toEqual(["chardham", "dubai", "kashmir"]);
  });
});
