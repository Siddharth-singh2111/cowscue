import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { pusherServer } from "@/lib/pusher";

/**
 * POST /api/reports/[id]/donate
 * Increments fundraising amount raised and broadcasts live updates to tracking screens.
 * 
 * NOTE FOR PRODUCTION STRIPE CONNECT / RAZORPAY INTEGRATION:
 * --------------------------------------------------------
 * To deploy this live:
 * 1. Initialize Stripe: const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
 * 2. Create Checkout Session instead of immediate database update:
 *    const session = await stripe.checkout.sessions.create({
 *      payment_method_types: ['card'],
 *      line_items: [{
 *        price_data: {
 *          currency: 'usd',
 *          product_data: { name: `Sponsorship: ${report.fundraisingTitle}` },
 *          unit_amount: amount * 100, // Stripe expects cents
 *        },
 *        quantity: 1,
 *      }],
 *      mode: 'payment',
 *      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/track/${id}?success=true`,
 *      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/track/${id}?canceled=true`,
 *      metadata: { reportId: id, sponsorName },
 *    });
 * 3. Return session.url to the frontend redirect.
 * 4. Setup a /api/webhook/stripe webhook listener to handle 'checkout.session.completed'
 *    event, extract metadata.reportId/sponsorName, and run the database update logic below.
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await req.json();
    const { amount, sponsorName } = body;

    const donationAmount = parseFloat(amount);
    if (isNaN(donationAmount) || donationAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid donation amount. Must be a positive number." },
        { status: 400 }
      );
    }

    const cleanSponsorName = sponsorName?.trim() || "Anonymous Sponsor";

    await connectDB();

    // Check if the report is fundraising
    const report = await Report.findById(params.id);
    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    if (!report.isFundraising) {
      return NextResponse.json(
        { error: "This rescue is not currently accepting sponsorships." },
        { status: 400 }
      );
    }

    // Increment fundraisingRaised
    const updatedReport = await Report.findByIdAndUpdate(
      params.id,
      {
        $inc: { fundraisingRaised: donationAmount }
      },
      { new: true }
    );

    if (!updatedReport) {
      return NextResponse.json({ error: "Failed to process donation." }, { status: 500 });
    }

    // Broadcast the donation in real-time to the citizen's tracking page
    try {
      await pusherServer.trigger(`report-${params.id}`, "donation-received", {
        amount: donationAmount,
        sponsorName: cleanSponsorName,
        report: updatedReport,
      });

      // Also update dashboard command center mapping
      await pusherServer.trigger("cowscue-alerts", "status-update", updatedReport);
    } catch (pusherErr) {
      console.error("Failed to broadcast donation updates via Pusher:", pusherErr);
    }

    return NextResponse.json(
      { 
        message: "Donation processed successfully.", 
        report: updatedReport, 
        amount: donationAmount, 
        sponsorName: cleanSponsorName 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing donation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
