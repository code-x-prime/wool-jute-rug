"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Edit, Trash2, Home, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AddressForm from "@/components/AddressForm";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch addresses
  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const response = await fetchApi("/users/addresses", {
        credentials: "include",
      });

      if (response.success) {
        setAddresses(response.data.addresses || []);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
      toast.error("Failed to load your addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Handle form success
  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditingAddress(null);
    fetchAddresses();
  };

  // Handle delete address
  const handleDeleteAddress = async (id) => {
    if (!confirm("Are you sure you want to delete this address?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetchApi(`/users/addresses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.success) {
        toast.success("Address deleted successfully");
        fetchAddresses();
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error(error.message || "Failed to delete address");
    } finally {
      setDeletingId(null);
    }
  };

  // Handle set default address
  const handleSetDefaultAddress = async (id) => {
    try {
      const response = await fetchApi(`/users/addresses/${id}`, {
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({ isDefault: true }),
      });

      if (response.success) {
        toast.success("Default address updated");
        fetchAddresses();
      }
    } catch (error) {
      console.error("Error setting default address:", error);
      toast.error(error.message || "Failed to set default address");
    }
  };

  // Loading state
  if (loading && addresses.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-light tracking-wide text-[#3D1C02] mb-2">My Addresses</h1>
        <div className="h-0.5 w-12 bg-[#C9A84C] mb-8" />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between gap-2 items-start mb-8">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-[#3D1C02]">My Addresses</h1>
          <div className="h-0.5 w-12 bg-[#C9A84C] mt-2" />
        </div>
        {!showAddForm && !editingAddress && (
          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
            className="px-4 py-2 border border-[#3D1C02] text-[#3D1C02] bg-transparent hover:bg-[#3D1C02] hover:text-white transition-colors rounded-lg text-sm font-medium tracking-wide"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Address
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-light tracking-wide text-[#3D1C02] mb-1">Add New Address</h2>
          <div className="h-0.5 w-8 bg-[#C9A84C] mb-5" />
          <AddressForm
            onSuccess={handleFormSuccess}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {editingAddress && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-light tracking-wide text-[#3D1C02] mb-1">Edit Address</h2>
          <div className="h-0.5 w-8 bg-[#C9A84C] mb-5" />
          <AddressForm
            existingAddress={editingAddress}
            onSuccess={handleFormSuccess}
            onCancel={() => setEditingAddress(null)}
          />
        </div>
      )}

      {/* Address List */}
      {addresses.length === 0 && !showAddForm && !editingAddress ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <MapPin className="h-14 w-14 mx-auto text-[#C9A84C]/40 mb-4" />
          <h2 className="text-lg font-light tracking-wide text-[#3D1C02] mb-2">No Addresses Found</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            You haven&apos;t added any addresses yet. Add one to make checkout
            faster.
          </p>
          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
            className="border border-[#3D1C02] text-[#3D1C02] bg-transparent hover:bg-[#3D1C02] hover:text-white transition-colors rounded-lg px-6 text-sm font-medium tracking-wide"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Address
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 relative transition-all hover:shadow-md ${address.isDefault ? "border-l-4 border-l-[#C9A84C]" : ""}`}
            >
              {address.isDefault && (
                <div className="absolute top-4 right-4">
                  <span className="bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Default
                  </span>
                </div>
              )}

              <div className="mb-4 pr-20">
                <h3 className="font-semibold text-[#3D1C02] mb-1">{address.name}</h3>
                <p className="text-sm text-gray-600">{address.street}</p>
                <p className="text-sm text-gray-600">
                  {address.city}, {address.state} {address.postalCode}
                </p>
                <p className="text-sm text-gray-600">{address.country}</p>
                <p className="text-sm text-gray-500 mt-1.5">
                  <span className="font-medium text-gray-600">Phone:</span> {address.phone}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap border-t border-gray-50 pt-3">
                {!address.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-[#3D1C02]/30 text-[#3D1C02] hover:bg-[#3D1C02] hover:text-white transition-colors rounded-lg"
                    onClick={() => handleSetDefaultAddress(address.id)}
                  >
                    <Home className="h-3.5 w-3.5 mr-1.5" />
                    Set as Default
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-gray-200 text-gray-600 hover:border-[#3D1C02] hover:text-[#3D1C02] transition-colors rounded-lg"
                  onClick={() => setEditingAddress(address)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors rounded-lg"
                  onClick={() => handleDeleteAddress(address.id)}
                  disabled={deletingId === address.id}
                >
                  {deletingId === address.id ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
