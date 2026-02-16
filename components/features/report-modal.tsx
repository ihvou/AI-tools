"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"

interface ReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "review" | "deal"
  onSubmit?: (issueType: string) => void
}

const REVIEW_ISSUES = [
  "Invalid receipt link",
  "Wrong tool matched",
  "Misleading snippet",
  "Other",
]

const DEAL_ISSUES = [
  "Code doesn't work",
  "Link is broken",
  "Offer expired",
  "Wrong tool matched",
  "Other",
]

export function ReportModal({ open, onOpenChange, type, onSubmit }: ReportModalProps) {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null)
  const issues = type === "review" ? REVIEW_ISSUES : DEAL_ISSUES

  const handleSubmit = () => {
    if (selectedIssue && onSubmit) {
      onSubmit(selectedIssue)
    }
    setSelectedIssue(null)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedIssue(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {issues.map((issue) => (
            <button
              key={issue}
              onClick={() => setSelectedIssue(issue)}
              className={`w-full text-left px-4 py-3 rounded hover:bg-gray-50 transition-colors ${
                selectedIssue === issue ? "bg-blue-50 text-blue-700" : "text-gray-700"
              }`}
            >
              {issue}
            </button>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={handleCancel}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!selectedIssue}
            className="flex-1 sm:flex-none"
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
