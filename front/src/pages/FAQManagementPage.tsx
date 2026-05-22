import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAllFaqs, deleteFaq, updateFaq, FAQ } from "@/api/faqService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Edit, MoreHorizontal, Plus, Trash, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Badge } from "@/components/ui/badge";


export default function FAQManagementPage() {
  const { t } = useLanguage();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "",
    order: 0,
    isPublished: true,
  });

  // Using useCallback to memoize these functions
  const loadFAQs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllFaqs();

      // Handle various possible response formats
      if (response?.data?.faqs && Array.isArray(response.data.faqs)) {
        // Format: { data: { faqs: [...] } }
        setFaqs(response.data.faqs);
      } else if (Array.isArray(response?.data)) {
        // Format: { data: [...] }
        setFaqs(response.data);
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        // Format: { data: { data: [...] } } or { statusCode, data: [...], message, success }
        setFaqs(response.data.data);
      } else {
        // Unexpected format
        console.error("Unexpected API response structure:", response);
        setFaqs([]);
      }
    } catch (error) {
      toast.error(t("faq_management.messages.load_error"));
      console.error(error);
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadFAQs();
  }, [loadFAQs]);

  const handleCreateNew = () => {
    setEditingFaq(null);
    setFormData({
      question: "",
      answer: "",
      category: "",
      order: faqs.length,
      isPublished: true,
    });
    setIsEditDialogOpen(true);
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "",
      order: faq.order,
      isPublished: faq.isPublished,
    });
    setIsEditDialogOpen(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData({
      ...formData,
      isPublished: checked,
    });
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.question || !formData.answer) {
        toast.error(t("faq_management.messages.required"));
        return;
      }

      if (editingFaq) {
        // Update existing
        await updateFaq(editingFaq.id, formData);
        toast.success(t("faq_management.messages.updated"));
      } else {
        // Create new
        navigate("/faq-management/create", { state: { formData } });
        return;
      }
      setIsEditDialogOpen(false);
      loadFAQs();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || t("faq_management.messages.save_error");
      toast.error(errorMsg);
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFaq(id);
      toast.success(t("faq_management.messages.deleted"));
      loadFAQs();
      setDeleteConfirmId(null);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || t("faq_management.messages.delete_error");
      toast.error(errorMsg);
      console.error(error);
    }
  };

  const togglePublish = async (faq: FAQ) => {
    try {
      // Just update the isPublished field, don't worry about other fields
      // Our updated backend function will handle this properly
      await updateFaq(faq.id, {
        isPublished: !faq.isPublished,
      });

      toast.success(faq.isPublished ? t("faq_management.messages.unpublished") : t("faq_management.messages.published"));
      loadFAQs();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || t("faq_management.messages.save_error");
      toast.error(errorMsg);
      console.error(error);
    }
  };

  // Filter FAQs
  const filteredFaqs = faqs
    .filter(
      (faq) =>
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (faq.category &&
          faq.category.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => a.order - b.order); // Sort by existing order

  return (
    <div className="space-y-8">
      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              {t("faq_management.title")}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5">
              {t("faq_management.description")}
            </p>
          </div>
          <Button
            onClick={handleCreateNew}
            className=""
          >
            <Plus className="mr-2 h-4 w-4" /> {t("faq_management.add_button")}
          </Button>
        </div>
        <div className="h-px bg-[var(--border-color)]" />
      </div>

      {/* Search Bar */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardContent className="p-4">
          <Input
            placeholder={t("faq_management.search_placeholder")}
            className="border-[var(--border-color)] focus:border-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
            {t("faq_management.list_title")}
          </CardTitle>
          <CardDescription className="text-sm text-[var(--text-secondary)]">
            {t("faq_management.list_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 border rounded"
                >
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {filteredFaqs.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-secondary)] mb-4">
                      <Edit className="h-8 w-8 text-[var(--text-secondary)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">
                      {faqs.length === 0
                        ? t("faq_management.no_faqs")
                        : t("faq_management.no_results")}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {faqs.length === 0
                        ? t("faq_management.create_first")
                        : t("faq_management.adjust_search")}
                    </p>
                  </div>
                </div>
              ) : (
                filteredFaqs.map((faq, index) => (
                  <div
                    key={faq.id}
                    className="p-6 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10 flex-shrink-0">
                          <span className="text-sm font-semibold text-[var(--accent)]">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                            {faq.question}
                          </h3>
                          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
                            {(faq.answer || "").replace(/<[^>]*>/g, "").substring(0, 100)}
                            {(faq.answer || "").length > 100 ? "..." : ""}
                          </p>
                          <div className="flex items-center gap-3">
                            {faq.category && (
                              <Badge
                                variant="outline"
                                className="bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] text-xs"
                              >
                                {faq.category}
                              </Badge>
                            )}
                            <Badge
                              className={
                                faq.isPublished
                                  ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30 text-xs font-medium"
                                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] text-xs font-medium"
                              }
                            >
                              {faq.isPublished ? t("faq_management.status_published") : t("faq_management.status_draft")}
                            </Badge>
                          </div>
                        </div>
                      </div>
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
                          <DropdownMenuLabel className="text-[var(--text-primary)]">
                            {t("faq_management.actions")}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                            onClick={() => handleEdit(faq)}
                          >
                            <Edit className="h-4 w-4 mr-2" /> {t("faq_management.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                            onClick={() => togglePublish(faq)}
                          >
                            {faq.isPublished ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" /> {t("faq_management.unpublish")}
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" /> {t("faq_management.publish")}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem

                            className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                            onClick={() => setDeleteConfirmId(faq.id)}
                          >
                            <Trash className="h-4 w-4 mr-2" /> {t("faq_management.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>
              {editingFaq ? t("faq_management.edit_title") : t("faq_management.create_title")}
            </DialogTitle>
            <DialogDescription>
              {t("faq_management.dialog_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="question" className="col-span-1">
                {t("faq_management.form.question")}
              </Label>
              <Input
                id="question"
                name="question"
                placeholder={t("faq_management.form.question_placeholder")}
                value={formData.question}
                onChange={handleFormChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="answer" className="col-span-1 pt-2">
                {t("faq_management.form.answer")}
              </Label>
              <Textarea
                id="answer"
                name="answer"
                placeholder={t("faq_management.form.answer_placeholder")}
                value={formData.answer}
                onChange={handleFormChange}
                className="col-span-3 min-h-[100px]"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="col-span-1">
                {t("faq_management.form.category")}
              </Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                className="col-span-3"
                placeholder={t("faq_management.form.category_placeholder")}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isPublished" className="col-span-1">
                {t("faq_management.form.publish_label")}
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch
                  id="isPublished"
                  checked={formData.isPublished}
                  onCheckedChange={handleSwitchChange}
                />
                <span className="ml-2">
                  {formData.isPublished ? t("faq_management.status_published") : t("faq_management.status_draft")}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("faq_management.form.cancel")}
            </Button>
            <Button onClick={handleSave}>{t("faq_management.form.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("faq_management.delete_dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("faq_management.delete_dialog.desc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t("faq_management.form.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              {t("faq_management.delete_dialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
