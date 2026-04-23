import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Link2,
  Copy,
  CheckCheck,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface InviteLinkPanelProps {
  competitionId: number;
  competitionName: string;
  /** Current token from the DB — null means none generated yet */
  initialToken: string | null;
  /** Whether the invite link is currently enabled */
  initialEnabled: boolean;
  /** Compact mode for use in list rows */
  compact?: boolean;
}

export default function InviteLinkPanel({
  competitionId,
  competitionName,
  initialToken,
  initialEnabled,
  compact = false,
}: InviteLinkPanelProps) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();

  const generateMutation = trpc.invites.generateLink.useMutation({
    onSuccess: (data) => {
      setToken(data.token);
      setEnabled(true);
      toast.success("New invite link generated");
      utils.competitions.list.invalidate();
      utils.competitions.get.invalidate({ id: competitionId });
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.invites.toggleLink.useMutation({
    onSuccess: (data) => {
      setEnabled(data.enabled);
      toast.success(data.enabled ? "Invite link enabled" : "Invite link disabled");
    },
    onError: (err) => toast.error(err.message),
  });

  const inviteUrl = token
    ? `${window.location.origin}/join/${token}`
    : null;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for browsers that block clipboard API
      const el = document.createElement("textarea");
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // ── Compact mode (for list rows) ───────────────────────────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {token ? (
          <>
            <Badge
              className={`text-xs font-semibold border-0 ${
                enabled
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {enabled ? "Link Active" : "Link Off"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1"
              onClick={handleCopy}
              disabled={!enabled}
            >
              {copied ? (
                <CheckCheck className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate({ competitionId })}
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Link2 className="w-3.5 h-3.5" />
            )}
            Generate Link
          </Button>
        )}
      </div>
    );
  }

  // ── Full panel mode (for CompetitionDetail) ────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2B4EAE]/10 flex items-center justify-center">
            <Link2 className="w-4 h-4 text-[#2B4EAE]" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-gray-900 text-sm">
              Invite Link
            </h3>
            <p className="text-xs text-gray-500">
              Share this link so entrants can self-register
            </p>
          </div>
        </div>
        {token && (
          <Badge
            className={`text-xs font-semibold border-0 ${
              enabled
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {enabled ? "Active" : "Disabled"}
          </Badge>
        )}
      </div>

      {token ? (
        <>
          {/* URL display */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
            <span className="text-xs text-gray-600 font-mono truncate flex-1 min-w-0">
              {inviteUrl}
            </span>
            <a
              href={inviteUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#2B4EAE] flex-shrink-0"
              title="Preview join page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className={`flex-1 min-w-[120px] font-semibold gap-1.5 ${
                enabled
                  ? "bg-[#2B4EAE] hover:bg-[#1a3580] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              onClick={handleCopy}
              disabled={!enabled || copied}
            >
              {copied ? (
                <>
                  <CheckCheck className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              title={enabled ? "Disable invite link" : "Enable invite link"}
              disabled={toggleMutation.isPending}
              onClick={() =>
                toggleMutation.mutate({ competitionId, enabled: !enabled })
              }
            >
              {toggleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : enabled ? (
                <ToggleRight className="w-4 h-4 text-green-600" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-gray-400" />
              )}
              {enabled ? "Disable" : "Enable"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              title="Regenerate invite link (invalidates the old one)"
              disabled={generateMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Regenerating the link will invalidate the current one. Anyone with the old link will need the new one. Continue?"
                  )
                ) {
                  generateMutation.mutate({ competitionId });
                }
              }}
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate
            </Button>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Anyone with this link can join <strong>{competitionName}</strong>. Disable it to stop new entries.
          </p>
        </>
      ) : (
        /* No token yet */
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-3">
            No invite link has been generated yet. Create one to start sharing this competition.
          </p>
          <Button
            size="sm"
            className="bg-[#C8521A] hover:bg-[#b04516] text-white font-semibold gap-1.5"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate({ competitionId })}
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            Generate Invite Link
          </Button>
        </div>
      )}
    </div>
  );
}
