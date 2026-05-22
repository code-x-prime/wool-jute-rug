import { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MoreHorizontal,
  Eye,
  Trash2,
  MessageSquare,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { API_URL } from "@/config/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

interface CustomRugRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dimensions: string | null;
  material: string | null;
  colors: string | null;
  designNotes: string | null;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED" | "SPAM";
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomRugRequestsResponse {
  submissions: CustomRugRequest[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    total: number;
  };
}

const updateStatusSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "SPAM"]),
  adminNotes: z.string().optional(),
});

const CustomRugsManagementPage = () => {
  const [submissions, setSubmissions] = useState<CustomRugRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<CustomRugRequest | null>(null);

  const { toast } = useToast();

  const statusLabels: Record<string, string> = {
    NEW: "New Request",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved",
    SPAM: "Spam",
  };

  const updateForm = useForm<z.infer<typeof updateStatusSchema>>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      status: "NEW",
      adminNotes: "",
    },
  });

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      let url = `${API_URL}/admin/custom-rugs?page=${page}&limit=10`;
      if (selectedStatus) {
        url += `&status=${selectedStatus}`;
      }

      const response = await axios.get<{ data: CustomRugRequestsResponse }>(
        url,
        { withCredentials: true }
      );

      const responseData = response.data?.data;
      setSubmissions(responseData?.submissions || []);
      setTotalPages(responseData?.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching custom rug requests:", error);
      setSubmissions([]);
      toast({
        title: "Error",
        description: "Failed to fetch custom rug requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [page, selectedStatus]);

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value === "ALL" ? null : value);
    setPage(1);
  };

  const handleViewSubmission = (submission: CustomRugRequest) => {
    setSelectedSubmission(submission);
    setViewDialogOpen(true);
  };

  const handleUpdateStatus = (submission: CustomRugRequest) => {
    setSelectedSubmission(submission);
    updateForm.setValue("status", submission.status);
    updateForm.setValue("adminNotes", submission.adminNotes || "");
    setUpdateDialogOpen(true);
  };

  const confirmDelete = (submission: CustomRugRequest) => {
    setSelectedSubmission(submission);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSubmission = async () => {
    if (!selectedSubmission) return;

    try {
      await axios.delete(`${API_URL}/admin/custom-rugs/${selectedSubmission.id}`, {
        withCredentials: true,
      });

      toast({
        title: "Success",
        description: "Request deleted successfully",
      });

      fetchSubmissions();
    } catch (error) {
      console.error("Error deleting custom rug request:", error);
      toast({
        title: "Error",
        description: "Failed to delete custom rug request",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedSubmission(null);
    }
  };

  const handleUpdateSubmission = async (
    values: z.infer<typeof updateStatusSchema>
  ) => {
    if (!selectedSubmission) return;

    try {
      await axios.put(
        `${API_URL}/admin/custom-rugs/${selectedSubmission.id}/status`,
        {
          status: values.status,
          adminNotes: values.adminNotes,
        },
        { withCredentials: true }
      );

      toast({
        title: "Success",
        description: "Status updated successfully",
      });

      fetchSubmissions();
      setUpdateDialogOpen(false);
      setSelectedSubmission(null);
    } catch (error) {
      console.error("Error updating custom rug request:", error);
      toast({
        title: "Error",
        description: "Failed to update custom rug request",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
            Custom Rug Requests
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1.5">
            Manage bespoke rug inquiries from customers
          </p>
        </div>
        <div className="h-px bg-[var(--border-color)]" />
      </div>

      {/* Filters Bar */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-10 border-[var(--border-color)] focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={selectedStatus || "ALL"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-full md:w-[180px] border-[var(--border-color)] focus:border-primary">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="NEW">New Request</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="SPAM">Spam</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent"></div>
                <p className="mt-4 text-base text-[var(--text-secondary)]">Loading requests...</p>
              </div>
            </div>
          ) : !submissions || submissions.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-secondary)] mb-4">
                  <MessageSquare className="h-8 w-8 text-[var(--text-secondary)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">
                  No Requests Found
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  There are no custom rug requests matching your criteria.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[var(--border-color)]">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="p-6 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10 flex-shrink-0">
                          <MessageSquare className="h-6 w-6 text-[var(--accent)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[var(--text-primary)] truncate">
                            {submission.name}
                          </h3>
                          <p className="text-sm text-[var(--text-secondary)] truncate">
                            {submission.email}
                          </p>
                          {submission.dimensions && (
                            <p className="text-xs text-[var(--text-secondary)] truncate mt-1">
                              Size: {submission.dimensions} | Mat: {submission.material}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-[var(--text-secondary)]">
                            {formatDistanceToNow(new Date(submission.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <Badge
                          className={
                            submission.status === "NEW"
                              ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30 text-xs font-medium"
                              : submission.status === "IN_PROGRESS"
                                ? "bg-[var(--text-primary)]/10 text-[var(--text-primary)] border-[var(--text-primary)]/20 text-xs font-medium"
                                : submission.status === "RESOLVED"
                                  ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30 text-xs font-medium"
                                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] text-xs font-medium"
                          }
                        >
                          {statusLabels[submission.status]}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 hover:bg-[var(--bg-secondary)]"
                            >
                              <MoreHorizontal className="h-4 w-4 text-[var(--text-primary)]" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-lg"
                          >
                            <DropdownMenuItem
                              className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                              onClick={() => handleViewSubmission(submission)}
                            >
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                              onClick={() => handleUpdateStatus(submission)}
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />{" "}
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                              onClick={() => confirmDelete(submission)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border-color)] px-6 py-4">
                <div className="text-sm text-[var(--text-secondary)]">
                  Page {page} of {totalPages}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                        className={
                          page <= 1
                            ? "pointer-events-none opacity-50"
                            : "hover:bg-[var(--bg-secondary)]"
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setPage(pageNum)}
                            isActive={pageNum === page}
                            className={
                              pageNum === page
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "hover:bg-[var(--bg-secondary)]"
                            }
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setPage((prev) =>
                            prev < totalPages ? prev + 1 : prev
                          )
                        }
                        className={
                          page >= totalPages
                            ? "pointer-events-none opacity-50"
                            : "hover:bg-[var(--bg-secondary)]"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-color)] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">
              Custom Rug Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6 py-4">
              
              {/* Customer Info Card */}
              <div className="bg-[var(--bg-secondary)] p-5 rounded-xl border border-[var(--border-color)]">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                  <span className="text-[var(--accent)]">●</span> Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider font-semibold">Name</p>
                    <p className="font-medium text-[var(--text-primary)]">{selectedSubmission.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider font-semibold">Email</p>
                    <p className="font-medium text-[var(--text-primary)] break-all">{selectedSubmission.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider font-semibold">Phone</p>
                    <p className="font-medium text-[var(--text-primary)]">{selectedSubmission.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider font-semibold">Status</p>
                    <Badge
                      className={
                        selectedSubmission.status === "NEW"
                          ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30 text-xs font-medium"
                          : selectedSubmission.status === "IN_PROGRESS"
                            ? "bg-[var(--text-primary)]/10 text-[var(--text-primary)] border-[var(--text-primary)]/20 text-xs font-medium"
                            : selectedSubmission.status === "RESOLVED"
                              ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30 text-xs font-medium"
                              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] text-xs font-medium"
                      }
                    >
                      {statusLabels[selectedSubmission.status]}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Rug Specifications Card */}
              <div className="bg-[var(--bg-secondary)] p-5 rounded-xl border border-[var(--border-color)]">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                  <span className="text-[var(--accent)]">●</span> Rug Specifications
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider font-semibold">Dimensions</p>
                    <p className="font-medium text-[var(--text-primary)]">{selectedSubmission.dimensions || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider font-semibold">Material</p>
                    <p className="font-medium text-[var(--text-primary)]">{selectedSubmission.material || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider font-semibold">Colors</p>
                    <p className="font-medium text-[var(--text-primary)]">{selectedSubmission.colors || "Not specified"}</p>
                  </div>
                </div>
              </div>

              {/* Design Notes */}
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--accent)]" /> Design Notes & Inspiration
                </h4>
                <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] whitespace-pre-wrap text-sm text-[var(--text-primary)] min-h-[80px]">
                  {selectedSubmission.designNotes || <span className="text-muted-foreground italic">No design notes provided.</span>}
                </div>
              </div>

              {/* Admin Notes */}
              {selectedSubmission.adminNotes && (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                    Internal Admin Notes
                  </h4>
                  <div className="p-4 bg-[var(--text-primary)]/5 rounded-lg border border-[var(--text-primary)]/20 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                    {selectedSubmission.adminNotes}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-color)]">
                <div>
                  <span className="font-semibold">Submitted:</span> {new Date(selectedSubmission.createdAt).toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold">Last Updated:</span> {new Date(selectedSubmission.updatedAt).toLocaleString()}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <Button
                  variant="outline"
                  className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                  onClick={() => {
                    setViewDialogOpen(false);
                    setSelectedSubmission(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  className=""
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleUpdateStatus(selectedSubmission);
                  }}
                >
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">
              Update Request Status
            </DialogTitle>
          </DialogHeader>
          <Form {...updateForm}>
            <form
              onSubmit={updateForm.handleSubmit(handleUpdateSubmission)}
              className="space-y-5 py-4"
            >
              <FormField
                control={updateForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-[var(--text-primary)]">
                      Status
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="border-[var(--border-color)] focus:border-primary">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">New Request</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="RESOLVED">Resolved</SelectItem>
                          <SelectItem value="SPAM">Spam</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="adminNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-[var(--text-primary)]">
                      Internal Admin Notes
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add private notes for your team..."
                        {...field}
                        value={field.value || ""}
                        className="border-[var(--border-color)] focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                  onClick={() => {
                    setUpdateDialogOpen(false);
                    setSelectedSubmission(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className=""
                >
                  Update
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[var(--text-primary)]">
              Are you sure you want to delete the request from{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {selectedSubmission?.name}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-[var(--destructive)] hover:bg-[var(--destructive)] text-white"
              onClick={handleDeleteSubmission}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomRugsManagementPage;
