'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type ReportType = 'review' | 'deal';

const REVIEW_ISSUE_TYPES = [
  'Invalid receipt link',
  'Wrong timestamp',
  'Wrong topic',
  'Wrong sentiment',
  'Duplicate entry',
  'Other',
] as const;

const DEAL_ISSUE_TYPES = [
  'Invalid or expired code',
  'Wrong offer text',
  'Wrong timestamp',
  'Broken receipt link',
  'Other',
] as const;

interface ReportIssueModalProps {
  reportType: ReportType;
  entityId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportIssueModal({ reportType, entityId, isOpen, onClose }: ReportIssueModalProps) {
  const issueOptions = useMemo(
    () => (reportType === 'review' ? REVIEW_ISSUE_TYPES : DEAL_ISSUE_TYPES),
    [reportType]
  );
  const [issueType, setIssueType] = useState<string>(issueOptions[0]);
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIssueType(issueOptions[0]);
    setDetails('');
    setEmail('');
    setIsSubmitting(false);
    setErrorMessage(null);
    setIsSubmitted(false);
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, issueOptions]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const notesParts = [
      details.trim() ? `Details:\n${details.trim()}` : '',
      email.trim() ? `Reporter email: ${email.trim()}` : '',
    ].filter(Boolean);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          entityId,
          issueType,
          notes: notesParts.length > 0 ? notesParts.join('\n\n') : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Report submit failed', error);
      setErrorMessage('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close report modal backdrop"
      />
      <div className="absolute inset-0 p-4 sm:p-6 flex items-center justify-center">
        <div className="w-full max-w-md rounded border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Report issue</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Close report modal"
            >
              <X size={16} />
            </button>
          </div>

          {isSubmitted ? (
            <div className="px-5 py-6 space-y-4">
              <p className="text-sm text-gray-700">Thanks, your report was submitted.</p>
              <div className="flex justify-end">
                <Button type="button" variant="primary" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="issueType" className="text-sm font-medium text-gray-700">
                  Issue type
                </label>
                <select
                  id="issueType"
                  value={issueType}
                  onChange={(event) => setIssueType(event.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {issueOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="details" className="text-sm font-medium text-gray-700">
                  Details (optional)
                </label>
                <textarea
                  id="details"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                  placeholder="Share any context that helps validate this issue."
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email (optional)
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit report'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
