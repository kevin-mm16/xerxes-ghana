import catalog from "@/config/imagery-catalog.json";

export function satelliteForYear(year: number) {
  const product = catalog.products.satellite;
  const dates = product.dates.filter(
    (date) => Number(date.slice(0, 4)) <= year,
  );
  return {
    ...product,
    date: dates.at(-1) ?? product.dates[0],
    endpoint: catalog.endpoint,
  };
}
