"use client";

import * as React from "react";
import { ChevronsUpDown, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Item = { id: string; name?: string };

export interface MultiSelectComboProps {
  items: Item[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  placeholder?: string;
  maxHeight?: number;
}

export default function MultiSelectCombo({
  items,
  selectedIds,
  onChange,
  label,
  placeholder = "Select...",
  maxHeight = 240,
}: MultiSelectComboProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const selectedItems = React.useMemo(() => {
    return selectedIds
      .map((id) => items.find((it) => it.id === id))
      .filter(Boolean) as Item[];
  }, [items, selectedIds]);

  const filtered = React.useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((i) => (i.name || "").toLowerCase().includes(q));
  }, [items, query]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange(Array.from(new Set([...selectedIds, id])));
  };

  const removeId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedIds.includes(id)) return;
    onChange(selectedIds.filter((x) => x !== id));
  };

  return (
    <div className="relative">
      {label && (
        <div className="mb-1 text-sm font-medium">{label}</div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal min-h-10 h-auto py-2",
              selectedIds.length === 0 && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {selectedIds.length === 0 ? (
                <span>
                  {placeholder}{" "}
                  <span className="text-xs text-muted-foreground">
                    (applies to all)
                  </span>
                </span>
              ) : selectedItems.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected
                </span>
              ) : (
                (() => {
                  const maxChips = 4;
                  const visible = selectedItems.slice(0, maxChips);
                  return (
                    <>
                      {visible.map((it) => (
                        <span
                          key={it.id}
                          className="inline-flex items-center gap-2 bg-muted px-2 py-0.5 rounded text-sm"
                        >
                          <span>{it.name}</span>
                          <button
                            type="button"
                            aria-label={`Remove ${it.name}`}
                            className="inline-flex p-1 hover:bg-muted-foreground/20 rounded"
                            onClick={(e) => removeId(it.id, e)}
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {selectedItems.length > maxChips && (
                        <span className="text-sm text-muted-foreground">
                          +{selectedItems.length - maxChips} more
                        </span>
                      )}
                    </>
                  );
                })()
              )}
            </div>
            <ChevronsUpDown className="opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-2">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${placeholder}...`}
              className="mb-2"
            />
            <div style={{ maxHeight, overflow: "auto" }}>
              {filtered.length === 0 ? (
                <div className="text-xs text-muted-foreground p-2">
                  No items found.
                </div>
              ) : (
                filtered.map((it) => (
                  <label
                    key={it.id}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm"
                  >
                    <Checkbox
                      checked={selectedIds.includes(it.id)}
                      onCheckedChange={() => toggle(it.id)}
                    />
                    <span className="text-sm">{it.name}</span>
                  </label>
                ))
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
