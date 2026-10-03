import {
  searchFromParams,
  validateSearch,
} from "@/features/flight-search/model";
import {
  FlightSearchError,
  getDuffelOffer,
} from "@/features/flight-results/duffel.server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const headers = { "Cache-Control": "no-store" };
  const criteria = searchFromParams(new URL(request.url).searchParams);
  const errors = validateSearch(criteria);
  if (!/^off_[A-Za-z0-9]{6,100}$/.test(id) || Object.keys(errors).length)
    return Response.json(
      {
        error:
          "This offer link is incomplete. Return to flights and search again.",
      },
      { status: 400, headers },
    );
  try {
    return Response.json(await getDuffelOffer(id, criteria, request.signal), {
      headers,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof FlightSearchError
            ? error.message
            : "The offer could not be loaded. Please try again.",
      },
      {
        status: error instanceof FlightSearchError ? error.status : 502,
        headers,
      },
    );
  }
}
