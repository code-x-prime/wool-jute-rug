"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientOnly } from "@/components/client-only";
import { DynamicIcon } from "@/components/dynamic-icon";
import { fetchApi, formatDate } from "@/lib/utils";
import { ProtectedRoute } from "@/components/protected-route";

export default function AccountPage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    profileImage: null,
  });
  const [preview, setPreview] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [referralCode, setReferralCode] = useState("");
  const [referralStats, setReferralStats] = useState(null);
  const [isLoadingReferral, setIsLoadingReferral] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        profileImage: null,
      });
    }
  }, [user]);

  // Fetch user addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;

      try {
        const response = await fetchApi("/users/addresses", {
          credentials: "include",
        });
        setAddresses(response.data.addresses || []);
      } catch (error) {
        console.error("Failed to fetch addresses:", error);
      }
    };

    fetchAddresses();
  }, [user]);

  // Fetch referral data
  useEffect(() => {
    const fetchReferralData = async () => {
      if (!user) return;
      try {
        setIsLoadingReferral(true);
        const response = await fetchApi("/referrals/my-code", {
          credentials: "include",
        });
        if (response.success) {
          setReferralCode(response.data.referralCode);
          setReferralStats(response.data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch referral data:", error);
      } finally {
        setIsLoadingReferral(false);
      }
    };
    fetchReferralData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "profileImage" && files.length > 0) {
      setFormData((prev) => ({
        ...prev,
        profileImage: files[0],
      }));

      // Create preview URL
      const file = files[0];
      setPreview(URL.createObjectURL(file));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      await updateProfile(formData);
      setIsEditing(false);
      setMessage({
        type: "success",
        text: "Profile updated successfully",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to update profile",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <ClientOnly>
        <div>
          <h1 className="text-2xl font-semibold text-[#3D1C02] mb-6 tracking-tight">My Profile</h1>

          {/* Profile information */}
          <div className="rounded-xl border border-gray-100 shadow-sm bg-white p-6 mb-6">
            <div className="flex justify-between gap-2 items-center mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Profile Information
              </h2>
              {!isEditing && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="border-[#3D1C02] text-[#3D1C02] hover:bg-[#3D1C02] hover:text-white transition-colors"
                >
                  <DynamicIcon name="Edit" className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>

            {message.text && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-[#FDF8F0] text-[#3D1C02] border border-[#C9A84C]/40"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleSubmit} className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5"
                    >
                      Full Name
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      className="border-gray-200 focus:border-[#C9A84C] focus:ring-[#C9A84C]/20"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5"
                    >
                      Phone Number
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="border-gray-200 focus:border-[#C9A84C] focus:ring-[#C9A84C]/20"
                    />
                  </div>
                  <div className="lg:col-span-2 flex gap-2 justify-end mt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#3D1C02] hover:bg-[#3D1C02]/90 text-white"
                    >
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-200 text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setIsEditing(false);
                        setPreview(null);
                        setFormData({
                          name: user?.name || "",
                          phone: user?.phone || "",
                          profileImage: null,
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Full Name</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Email Address</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.email || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Phone Number</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.phone || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Member Since</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.createdAt ? formatDate(user.createdAt) : "Unknown"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recent addresses */}
          <div className="rounded-xl border border-gray-100 shadow-sm bg-white p-6 mb-6">
            <div className="flex justify-between gap-2 items-center mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Saved Addresses
              </h2>
              <Link href="/account/addresses">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#3D1C02] text-[#3D1C02] hover:bg-[#3D1C02] hover:text-white transition-colors text-wrap py-2"
                >
                  Manage Addresses
                </Button>
              </Link>
            </div>

            {addresses.length > 0 ? (
              <div className="grid gap-3">
                {addresses.slice(0, 2).map((address) => (
                  <div
                    key={address.id}
                    className="border-l-4 border-[#C9A84C] rounded-r-lg bg-gray-50 p-4 flex justify-between items-start"
                  >
                    <div>
                      {address.isDefault && (
                        <span className="inline-block text-xs bg-[#3D1C02]/10 text-[#3D1C02] px-2 py-0.5 rounded-full mb-2 font-medium">
                          Default
                        </span>
                      )}
                      <p className="text-sm font-medium text-gray-900">
                        {address.name || user?.name}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {address.street}, {address.city}, {address.state}{" "}
                        {address.postalCode}
                      </p>
                      <p className="text-sm text-gray-500">
                        {address.country}
                      </p>
                    </div>
                  </div>
                ))}

                {addresses.length > 2 && (
                  <p className="text-sm text-gray-400 pl-1">
                    + {addresses.length - 2} more addresses
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
                <DynamicIcon
                  name="MapPin"
                  className="h-8 w-8 mx-auto text-[#C9A84C] mb-2"
                />
                <p className="text-sm text-gray-500">No addresses added yet</p>
                <Link href="/account/addresses" className="mt-3 inline-block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-[#3D1C02] text-[#3D1C02] hover:bg-[#3D1C02] hover:text-white transition-colors"
                  >
                    Add Address
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Referral Program */}
          <div className="bg-[#FDF8F0] rounded-xl border border-[#C9A84C]/30 p-6 mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <DynamicIcon name="Users" className="h-5 w-5 text-[#3D1C02]" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Referral Program</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Share your referral code with friends and earn rewards when they make their first order!
            </p>

            {isLoadingReferral ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
              </div>
            ) : (
              <>
                {/* Referral Code */}
                <div className="bg-white rounded-xl p-4 mb-6 border border-[#C9A84C]">
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                    Your Referral Code
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={referralCode}
                      readOnly
                      className="font-mono text-lg font-bold bg-gray-50 border-[#C9A84C]/40 focus:border-[#C9A84C]"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(referralCode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="min-w-[100px] bg-[#3D1C02] hover:bg-[#3D1C02]/90 text-white"
                    >
                      {copied ? (
                        <>
                          <DynamicIcon name="Check" className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <DynamicIcon name="Copy" className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Share this code with friends. You&apos;ll earn ₹{referralStats?.totalEarnings || "0"} when they place their first order!
                  </p>
                </div>

                {/* Referral Stats */}
                {referralStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white border border-gray-100 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-[#3D1C02]">
                        {referralStats.totalReferrals || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Total Referrals</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-[#3D1C02]">
                        {referralStats.completedReferrals || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Completed</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-[#C9A84C]">
                        {referralStats.pendingReferrals || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Pending</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-[#3D1C02] flex items-center justify-center gap-1">
                        <span>₹</span>
                        {parseFloat(referralStats.totalEarnings || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Total Earnings</p>
                    </div>
                  </div>
                )}

                {/* Share Buttons */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    onClick={() => {
                      const text = `Join me on Wool Jute Rug Co! Use my referral code: ${referralCode} and get amazing discounts on premium handcrafted rugs!`;
                      if (navigator.share) {
                        navigator.share({
                          title: "Referral Code",
                          text: text,
                        });
                      } else {
                        navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    className="bg-[#3D1C02] hover:bg-[#3D1C02]/90 text-white"
                  >
                    <DynamicIcon name="Share2" className="h-4 w-4 mr-2" />
                    Share Referral Code
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Security section - only for credential (email/password) users */}
          {user?.hasPassword !== false && (
            <div className="rounded-xl border border-gray-100 shadow-sm bg-white p-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">Security</h2>
              <div className="space-y-4">
                <Link href="/account/change-password">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto border-[#3D1C02] text-[#3D1C02] hover:bg-[#3D1C02] hover:text-white transition-colors"
                  >
                    <DynamicIcon name="Lock" className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </ClientOnly>
    </ProtectedRoute>
  );
}
