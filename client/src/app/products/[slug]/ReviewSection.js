"use client";

import { useState, useRef } from "react";
import { Star, AlertCircle, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";


export default function ReviewSection({ product }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    title: "",
    comment: "",
  });
  const [images, setImages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const fileInputRef = useRef(null);

  // Rating calculation
  const totalReviews = product.reviews ? product.reviews.length : 0;
  const avgRating = totalReviews > 0 ? (product.reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews) : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => {
    const count = product.reviews ? product.reviews.filter(r => r.rating === star).length : 0;
    const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percentage };
  });

  // Extract all review images for the photos strip
  const allReviewImages = [];
  if (product.reviews) {
    product.reviews.forEach(review => {
      if (review.images && review.images.length > 0) {
        review.images.forEach(img => {
          allReviewImages.push({ url: img, reviewId: review.id, user: review.user.name });
        });
      }
    });
  }

  // Event handlers
  const handleRatingClick = (rating) => {
    setReviewForm((prev) => ({ ...prev, rating }));
    if (formErrors.rating) setFormErrors((prev) => ({ ...prev, rating: null }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReviewForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (images.length + selectedFiles.length > 5) {
        toast.error("You can upload a maximum of 5 images");
        return;
      }
      setImages((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errors = {};
    if (reviewForm.rating === 0) errors.rating = "Please select a rating";
    if (!reviewForm.comment.trim()) errors.comment = "Please provide a review comment";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push(`/auth?redirect=/products/${product.slug}&review=true`);
      return;
    }
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("productId", product.id);
      formData.append("rating", reviewForm.rating);
      if (reviewForm.title.trim()) formData.append("title", reviewForm.title.trim());
      formData.append("comment", reviewForm.comment.trim());

      images.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetchApi(`/users/reviews`, {
        method: "POST",
        body: formData,
        // Content-Type is intentionally omitted so the browser sets multipart/form-data with the correct boundary
      });

      if (response.success) {
        toast.success("Review submitted successfully!");
        setReviewForm({ rating: 0, title: "", comment: "" });
        setImages([]);
        setShowForm(false);
        window.location.reload();
      } else {
        toast.error(response.message || "Failed to submit review");
      }
    } catch (error) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Side: Rating Summary */}
        <div className="lg:col-span-4">
          <h2 className="text-2xl font-bold mb-4">Customer reviews</h2>

          <div className="flex items-center mb-2">
            <div className="flex text-[#FFA41C]">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-5 w-5"
                  fill={star <= Math.round(avgRating) ? "currentColor" : "none"}
                  color="#FFA41C"
                />
              ))}
            </div>
            <span className="ml-2 text-lg font-medium">{avgRating.toFixed(1)} out of 5</span>
          </div>
          <p className="text-sm text-gray-600 mb-6">{totalReviews} global ratings</p>

          <div className="space-y-3 mb-10">
            {ratingDistribution.map((item) => (
              <div key={item.star} className="flex items-center text-sm">
                <span className="w-12 text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer">
                  {item.star} star
                </span>
                <div className="flex-1 mx-3 h-4 bg-gray-100 rounded-sm border border-gray-300 overflow-hidden relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-[#FFA41C] border border-[#DE7921] rounded-sm shadow-[inset_0_1px_0_rgba(255,255,255,.3)] transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-300 pt-6">
            <h3 className="text-lg font-bold mb-2">Review this product</h3>
            <p className="text-sm text-gray-600 mb-4">Share your thoughts with other customers</p>
            <Button
              onClick={() => {
                if (!isAuthenticated) {
                  router.push(`/auth?redirect=/products/${product.slug}&review=true`);
                  return;
                }
                setShowForm(!showForm);
              }}
              variant="outline"
              className="w-full justify-center bg-white border-gray-300 text-gray-900 rounded-full hover:bg-gray-50 font-normal"
            >
              Write a product review
            </Button>
          </div>
        </div>

        {/* Right Side: Reviews Content */}
        <div className="lg:col-span-8">
          {/* Review Form Area */}
          {showForm && (
            <div className="mb-10 p-6 border border-gray-200 rounded-lg bg-gray-50 transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Create Review</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleReviewSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Overall rating
                  </label>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        className="h-8 w-8 cursor-pointer text-[#FFA41C] transition-all hover:scale-110"
                        fill={reviewForm.rating >= rating ? "currentColor" : "none"}
                        onClick={() => handleRatingClick(rating)}
                      />
                    ))}
                  </div>
                  {formErrors.rating && <p className="text-sm text-red-600 mt-1">{formErrors.rating}</p>}
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <label htmlFor="title" className="block text-sm font-bold mb-2">
                    Add a headline
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={reviewForm.title}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007185] focus:border-[#007185] ${formErrors.title ? "border-red-600" : "border-gray-300"}`}
                    placeholder="What's most important to know?"
                  />
                  {formErrors.title && <p className="text-sm text-red-600 mt-1">{formErrors.title}</p>}
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-bold mb-2">
                    Add a photo
                  </label>
                  <p className="text-sm text-gray-600 mb-3">Shoppers find images more helpful than text alone. (Max 5)</p>

                  <div className="flex flex-wrap gap-4 mb-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative w-24 h-24 border rounded-md overflow-hidden bg-gray-100 group">
                        <img src={URL.createObjectURL(img)} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {images.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <ImageIcon className="h-8 w-8 mb-1" />
                        <span className="text-xs">Add photo</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                  />
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <label htmlFor="comment" className="block text-sm font-bold mb-2">
                    Add a written review
                  </label>
                  <textarea
                    id="comment"
                    name="comment"
                    value={reviewForm.comment}
                    onChange={handleInputChange}
                    rows={4}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007185] focus:border-[#007185] ${formErrors.comment ? "border-red-600" : "border-gray-300"}`}
                    placeholder="What did you like or dislike? What did you use this product for?"
                  ></textarea>
                  {formErrors.comment && <p className="text-sm text-red-600 mt-1">{formErrors.comment}</p>}
                </div>

                <div className="border-t border-gray-200 pt-6 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="px-6 rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="px-6 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-black border border-[#FCD200] rounded-full font-normal shadow-[0_2px_5px_0_rgba(213,217,217,.5)]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Customer Photos Scroll */}
          {allReviewImages.length > 0 && (
            <div className="mb-10">
              <h3 className="font-bold text-lg mb-4">Customer photos and videos</h3>
              <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                {allReviewImages.map((img, idx) => (
                  <div key={idx} className="w-32 h-32 flex-shrink-0 border border-gray-200 rounded-md overflow-hidden bg-gray-100 group relative">
                    <img src={img.url} alt={`Review photo by ${img.user}`} className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review List */}
          <div>
            <h3 className="font-bold text-lg mb-6">Top reviews</h3>

            {product.reviews && product.reviews.length > 0 ? (
              <div className="space-y-8">
                {product.reviews.map((review) => (
                  <div key={review.id} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${review.user.name}&background=random`} alt={review.user.name} />
                      </div>
                      <span className="font-medium text-[15px]">{review.user.name}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex text-[#FFA41C]">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className="h-4 w-4"
                            fill={star <= review.rating ? "currentColor" : "none"}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-[15px] text-[#0F1111]">{review.title}</span>
                    </div>

                    <p className="text-[13px] text-[#565959] mb-1">
                      Reviewed in India on {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>

                    <p className="text-[11px] font-bold text-[#C7511F] mb-3">Verified Purchase</p>

                    <p className="text-[15px] text-[#0F1111] leading-relaxed whitespace-pre-line mb-3">
                      {review.comment}
                    </p>

                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mb-3 overflow-x-auto">
                        {review.images.map((img, idx) => (
                          <div key={idx} className="w-24 h-24 flex-shrink-0 border rounded-md overflow-hidden bg-gray-100">
                            <img src={img} alt="Review attachment" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
