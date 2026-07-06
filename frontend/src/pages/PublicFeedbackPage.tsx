import { useState } from "react";
import { useParams } from "react-router-dom";
import { StarIcon } from "lucide-react";
import { usePublicFeedback, useSubmitPublicFeedback } from "@/hooks/useFeedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PublicFeedbackPage() {
  const { token = "" } = useParams<{ token: string }>();
  const { data, isLoading, isError } = usePublicFeedback(token);
  const submitMutation = useSubmitPublicFeedback(token);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    await submitMutation.mutateAsync({ rating, comment: comment || undefined });
    setSubmitted(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {!isLoading && (isError || !data) && (
            <p className="text-center text-neutral-500">
              This feedback link is invalid or has expired.
            </p>
          )}

          {!isLoading && data && (data.alreadySubmitted || submitted) && (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-neutral-800">Thank you!</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Your feedback for ticket {data.ticketNo} has already been recorded.
              </p>
            </div>
          )}

          {!isLoading && data && !data.alreadySubmitted && !submitted && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-neutral-800">How did we do?</h2>
                <p className="text-sm text-neutral-500">
                  Ticket {data.ticketNo} for {data.companyName} was recently closed. We'd love to
                  hear your feedback.
                </p>
              </div>

              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`${value} star${value > 1 ? "s" : ""}`}
                  >
                    <StarIcon
                      className={cn(
                        "h-8 w-8",
                        value <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"
                      )}
                    />
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Any additional comments (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />

              <Button
                className="w-full"
                disabled={rating === 0 || submitMutation.isPending}
                onClick={handleSubmit}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
