import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let loading: Promise<google.maps.MapsLibrary> | undefined;
let authenticationFailed = false;
const failureListeners = new Set<() => void>();

export function onGoogleMapsAuthFailure(listener: () => void) {
  failureListeners.add(listener);
  if (authenticationFailed) listener();
  return () => {
    failureListeners.delete(listener);
  };
}

export function loadGoogleMaps(key: string) {
  if (!loading) {
    const browser = window as Window & { gm_authFailure?: () => void };
    const previous = browser.gm_authFailure;
    browser.gm_authFailure = () => {
      authenticationFailed = true;
      failureListeners.forEach((listener) => listener());
      previous?.();
    };
    setOptions({ key, v: "quarterly", language: "en", region: "GH" });
    loading = importLibrary("maps");
  }
  return loading;
}
