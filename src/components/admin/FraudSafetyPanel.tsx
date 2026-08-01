import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Copy,
  Ban,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  DuplicatePair,
  BlacklistEntry,
  fetchDuplicateListings,
  fetchBlacklistEntries,
  addToBlacklist,
  removeFromBlacklist
} from "@/services/fraudSafetyService";
import { supabase } from "@/integrations/supabase/client";

export const FraudSafetyPanel: React.FC = () => {
  // Item 1: Duplicate listings state
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [ignoredPairs, setIgnoredPairs] = useState<string[]>([]);
  const [selectedPairForAction, setSelectedPairForAction] = useState<{
    pair: DuplicatePair;
    action: "merge" | "reject" | "ignore";
  } | null>(null);

  // Item 4: Blacklist state
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // New Blacklist form state
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newReason, setNewReason] = useState("");
  const [submittingBlacklist, setSubmittingBlacklist] = useState(false);
  const [showAddBlacklistModal, setShowAddBlacklistModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingDuplicates(true);
    setLoadingBlacklist(true);
    try {
      const [dups, bl] = await Promise.all([
        fetchDuplicateListings(),
        fetchBlacklistEntries(),
      ]);
      setDuplicates(dups);
      setBlacklist(bl);
    } catch (err) {
      console.error("Error loading fraud & safety data:", err);
    } finally {
      setLoadingDuplicates(false);
      setLoadingBlacklist(false);
    }
  };

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() && !newPhone.trim()) {
      toast.error("Please enter an email or phone number to blacklist.");
      return;
    }

    setSubmittingBlacklist(true);
    const res = await addToBlacklist({
      email: newEmail,
      phone: newPhone,
      reason: newReason,
    });

    if (res.success) {
      toast.success("Entry added to blacklist. Future signups will be blocked.");
      setNewEmail("");
      setNewPhone("");
      setNewReason("");
      setShowAddBlacklistModal(false);
      const updated = await fetchBlacklistEntries();
      setBlacklist(updated);
    } else {
      toast.error(res.error || "Failed to add to blacklist");
    }
    setSubmittingBlacklist(false);
  };

  const handleRemoveBlacklist = async (id: string) => {
    const success = await removeFromBlacklist(id);
    if (success) {
      toast.success("Removed entry from blacklist.");
      setBlacklist((prev) => prev.filter((item) => item.id !== id));
    } else {
      toast.error("Failed to remove entry from blacklist.");
    }
  };

  const handleConfirmPairAction = async () => {
    if (!selectedPairForAction) return;

    const { pair, action } = selectedPairForAction;
    const pairKey = `${pair.listing1_id}-${pair.listing2_id}`;

    if (action === "ignore" || action === "reject") {
      setIgnoredPairs((prev) => [...prev, pairKey]);
      toast.info(`Marked match between "${pair.listing1_title}" and "${pair.listing2_title}" as ${action}d.`);
    } else if (action === "merge") {
      try {
        // Soft delete / archive listing 2
        const tableName = pair.listing1_type === "mess" ? "mess" : "rooms";
        await (supabase as any)
          .from(tableName)
          .update({ status: "archived" })
          .eq("id", pair.listing2_id);

        toast.success(`Merged listings! Listing 2 archived while keeping Listing 1.`);
        setDuplicates((prev) => prev.filter((p) => p.listing1_id !== pair.listing1_id || p.listing2_id !== pair.listing2_id));
      } catch (err) {
        toast.error("Failed to archive duplicate listing.");
      }
    }

    setSelectedPairForAction(null);
  };

  const filteredBlacklist = blacklist.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.email && item.email.toLowerCase().includes(q)) ||
      (item.phone && item.phone.includes(q)) ||
      (item.reason && item.reason.toLowerCase().includes(q))
    );
  });

  const activeDuplicates = duplicates.filter(
    (p) => !ignoredPairs.includes(`${p.listing1_id}-${p.listing2_id}`)
  );

  return (
    <div className="space-y-8 text-left">
      {/* Item 1: Duplicate Listing Detection Panel */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Copy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-foreground">Duplicate Listing Detection (Trigram Matching)</h2>
              <p className="text-xs text-muted-foreground">
                Powered by PostgreSQL <code className="font-mono text-amber-500">pg_trgm</code> similarity matching
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loadingDuplicates}
            className="gap-2 text-xs border-border/60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDuplicates ? "animate-spin text-amber-500" : ""}`} />
            Scan Duplicates
          </Button>
        </div>

        {activeDuplicates.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 border border-dashed border-border/60 rounded-xl space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-semibold text-sm text-foreground">No Duplicate Listings Detected</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              All active room and mess listings have unique titles and addresses. Future duplicates will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeDuplicates.map((pair, idx) => {
              const similarityPct = Math.round(pair.similarity * 100);

              return (
                <div
                  key={idx}
                  className="bg-muted/20 border border-border/40 p-4 rounded-xl space-y-3 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono border-amber-500/40 text-amber-500">
                        {pair.listing1_type}
                      </Badge>
                      <Badge className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        Similarity: {similarityPct}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 bg-background border rounded-lg">
                        <span className="text-[10px] text-muted-foreground block uppercase font-mono">Listing 1</span>
                        <strong className="text-foreground">{pair.listing1_title}</strong>
                      </div>
                      <div className="p-2.5 bg-background border rounded-lg">
                        <span className="text-[10px] text-muted-foreground block uppercase font-mono">Listing 2 (Candidate Duplicate)</span>
                        <strong className="text-foreground">{pair.listing2_title}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Explicit Admin Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPairForAction({ pair, action: "ignore" })}
                      className="text-xs h-8"
                    >
                      Ignore
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setSelectedPairForAction({ pair, action: "reject" })}
                      className="text-xs h-8"
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSelectedPairForAction({ pair, action: "merge" })}
                      className="text-xs h-8 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      Merge Listings
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item 4: Blacklist Management Panel */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <Ban className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-foreground">Blacklist & Fraud Prevention</h2>
              <p className="text-xs text-muted-foreground">
                Prevents blacklisted emails and phone numbers from registering accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search blacklist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs w-48 bg-background"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddBlacklistModal(true)}
              className="gap-1.5 text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5" /> Add to Blacklist
            </Button>
          </div>
        </div>

        {/* Blacklist Table View */}
        {filteredBlacklist.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 border border-dashed border-border/60 rounded-xl space-y-2">
            <Ban className="w-8 h-8 text-muted-foreground opacity-40 mx-auto" />
            <p className="font-semibold text-sm text-foreground">No Blacklisted Entries Found</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Add email addresses or phone numbers to prevent fraudulent accounts from signing up.
            </p>
          </div>
        ) : (
          <div className="border border-border/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-mono uppercase text-[10px] border-b border-border/60">
                  <tr>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Phone Number</th>
                    <th className="p-3">Ban Reason</th>
                    <th className="p-3">Date Added</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredBlacklist.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-medium text-foreground">
                        {entry.email ? (
                          <span className="font-mono text-emerald-500">{entry.email}</span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="p-3 text-foreground">
                        {entry.phone ? (
                          <span className="font-mono text-blue-500">{entry.phone}</span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{entry.reason || "Safety Violation"}</td>
                      <td className="p-3 text-muted-foreground font-mono">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveBlacklist(entry.id)}
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Blacklist Modal Form */}
      {showAddBlacklistModal && (
        <Dialog open={true} onOpenChange={setShowAddBlacklistModal}>
          <DialogContent className="max-w-md bg-card">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Ban className="w-5 h-5 text-destructive" /> Add Entry to Blacklist
              </DialogTitle>
              <DialogDescription className="text-xs">
                Blacklisted accounts will be blocked during sign-up attempts.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddBlacklist} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <Input
                  type="email"
                  placeholder="e.g. scammer@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Reason for Blacklisting</label>
                <Input
                  placeholder="e.g. Reported multiple fake deposit listings"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="bg-background"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddBlacklistModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={submittingBlacklist}>
                  {submittingBlacklist ? "Saving..." : "Add to Blacklist"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Modal for Explicit Admin Action */}
      {selectedPairForAction && (
        <Dialog open={true} onOpenChange={() => setSelectedPairForAction(null)}>
          <DialogContent className="max-w-md bg-card">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Confirm {selectedPairForAction.action} Action
              </DialogTitle>
              <DialogDescription className="text-xs">
                Requires explicit admin confirmation. This action will not auto-delete data.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2 text-xs">
              <p>
                Are you sure you want to mark match between <strong>"{selectedPairForAction.pair.listing1_title}"</strong> and <strong>"{selectedPairForAction.pair.listing2_title}"</strong> as <strong>{selectedPairForAction.action}</strong>?
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPairForAction(null)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmPairAction} className="bg-amber-500 hover:bg-amber-600 text-white">
                Confirm {selectedPairForAction.action}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
