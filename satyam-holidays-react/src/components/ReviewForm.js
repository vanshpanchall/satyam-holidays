import { useId, useState } from "react";
import { PiStarFill } from "react-icons/pi";
import { toast } from "react-toastify";
import { apiUrl, fetchWithAuth, toastApiError } from "../config/siteConfig";

const EMPTY = { name: "", email: "", rating: 0, title: "", comment: "" };
const RATING_WORDS = ["", "Poor", "Below expectations", "Good", "Very good", "Excellent"];

const ReviewForm = ({ packageId, packageTitle, onReviewSubmitted }) => {
  const uid = useId();
  const [formData, setFormData] = useState(EMPTY);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.rating === 0) return toast.error("Please pick a star rating");
    if (!formData.name.trim()) return toast.error("Please enter your name");
    if (!formData.email.trim()) return toast.error("Please enter your email");
    if (formData.comment.trim().length < 10) return toast.error("Please write at least a sentence");

    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth(apiUrl("/api/reviews"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, packageId }),
      });
      const data = await response
        .json()
        .catch(() => ({ success: false, message: "Invalid server response" }));

      if (data.success) {
        toast.success("Thank you for your review!");
        setFormData(EMPTY);
        setSubmitted(true);
        onReviewSubmitted?.();
      } else {
        toastApiError(data, "Couldn't submit your review");
      }
    } catch (err) {
      toastApiError(err, "Couldn't submit your review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-3xl bg-raised p-8" role="status">
        <p className="font-display text-2xl text-fg">Thanks for sharing.</p>
        <p className="mt-2 text-muted">
          Your review will appear here once our team has checked it.
        </p>
        <button type="button" onClick={() => setSubmitted(false)} className="btn btn-ghost mt-5">
          Write another
        </button>
      </div>
    );
  }

  const shown = hoveredRating || formData.rating;

  return (
    <div className="rounded-3xl border border-line p-6 md:p-8">
      <h3 className="font-display text-2xl text-fg">Write a review</h3>
      {packageTitle && (
        <p className="mt-1 text-sm text-muted">
          How was <span className="text-fg">{packageTitle}</span>?
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="label">Your rating *</legend>
          <div className="flex items-center gap-3">
            <div className="flex" onMouseLeave={() => setHoveredRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
                  onMouseEnter={() => setHoveredRating(star)}
                  aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                  aria-pressed={formData.rating === star}
                  className="p-0.5"
                >
                  <PiStarFill
                    className={`h-8 w-8 transition-colors ${star <= shown ? "text-saffron-500" : "text-line"}`}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm text-muted">{RATING_WORDS[shown]}</span>
          </div>
        </fieldset>

        <div>
          <label htmlFor={`${uid}-name`} className="label">
            Your name *
          </label>
          <input
            id={`${uid}-name`}
            type="text"
            name="name"
            autoComplete="name"
            value={formData.name}
            onChange={handleInputChange}
            className="field"
            required
          />
        </div>
        <div>
          <label htmlFor={`${uid}-email`} className="label">
            Email * <span className="font-normal">(not published)</span>
          </label>
          <input
            id={`${uid}-email`}
            type="email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleInputChange}
            className="field"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-title`} className="label">
            Headline
          </label>
          <input
            id={`${uid}-title`}
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="field"
            maxLength={200}
            placeholder="Sum it up in a few words"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-comment`} className="label">
            Your review *
          </label>
          <textarea
            id={`${uid}-comment`}
            name="comment"
            rows={4}
            value={formData.comment}
            onChange={handleInputChange}
            className="field resize-y"
            placeholder="What stood out? Hotels, guides, food, pace…"
            required
            minLength={10}
            maxLength={1000}
          />
          <p className="mt-1 text-right text-xs text-muted">{formData.comment.length}/1000</p>
        </div>
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            Reviews are published after a quick check by our team.
          </p>
          <button type="submit" disabled={isSubmitting} className="btn btn-ink">
            {isSubmitting ? "Submitting…" : "Submit review"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
