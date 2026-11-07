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

export interface ImageryStatus {
  state: "loading" | "ready" | "unavailable";
  provider: "esri" | "deafrica" | "unavailable";
  label: string;
}

export const detailImagery = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution:
    'Source: <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">Esri, Vantor, Earthstar Geographics, GIS User Community</a>',
  maxNativeZoom: 19,
};
