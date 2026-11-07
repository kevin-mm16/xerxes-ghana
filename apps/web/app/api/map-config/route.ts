export const dynamic = "force-dynamic";

// Only a browser-restricted Maps key belongs here. This is public configuration.
export function GET() {
  const read = (name: string) => process.env[name]?.trim();
  return Response.json(
    {
      googleMapsApiKey:
        read("GOOGLE_MAPS_BROWSER_KEY") ||
        read("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY") ||
        null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
