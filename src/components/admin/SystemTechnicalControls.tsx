import React, { useState, useEffect } from "react";
import {
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Sliders,
  Check,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ThirdPartyService,
  initialServicesList,
  testServiceConnection
} from "@/services/apiStatusService";
import {
  FeatureFlags,
  getFeatureFlags,
  updateFeatureFlags,
  defaultFeatureFlags
} from "@/services/featureFlagsService";

export const SystemTechnicalControls: React.FC = () => {
  // Services status state (Item 3)
  const [services, setServices] = useState<ThirdPartyService[]>(initialServicesList());
  const [testingAll, setTestingAll] = useState(false);

  // Feature flags state (Item 2)
  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags);
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [savingFlag, setSavingFlag] = useState<string | null>(null);

  // Load feature flags on mount
  useEffect(() => {
    loadFlags();
    runAllTests();
  }, []);

  const loadFlags = async () => {
    setLoadingFlags(true);
    const data = await getFeatureFlags();
    setFlags(data);
    setLoadingFlags(false);
  };

  const handleToggleFlag = async (flagKey: keyof FeatureFlags, newValue: boolean) => {
    setSavingFlag(flagKey);
    const updated = { ...flags, [flagKey]: newValue };
    setFlags(updated);

    try {
      await updateFeatureFlags({ [flagKey]: newValue });
      toast.success(`Feature flag '${flagKey}' updated to ${newValue ? "ON" : "OFF"}`);
    } catch (err) {
      toast.error(`Failed to update feature flag '${flagKey}'`);
      loadFlags();
    } finally {
      setSavingFlag(null);
    }
  };

  const runSingleTest = async (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, status: "testing" } : s))
    );

    const result = await testServiceConnection(serviceId);

    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              status: result.status,
              responseTimeMs: result.responseTimeMs,
              message: result.message,
              lastTestedAt: new Date().toLocaleTimeString(),
            }
          : s
      )
    );
  };

  const runAllTests = async () => {
    setTestingAll(true);
    const list = initialServicesList();
    setServices(list);

    for (const service of list) {
      if (service.isConfigured) {
        await runSingleTest(service.id);
      }
    }
    setTestingAll(false);
  };

  const flagDescriptions: Record<keyof FeatureFlags, { label: string; desc: string }> = {
    ai_search: {
      label: "AI Smart Search & Recommendation Engine",
      desc: "Enables natural language search queries and AI recommendations across room and mess listings.",
    },
    chat: {
      label: "Live Messaging & Owner Chat",
      desc: "Allows tenants and room/mess owners to exchange direct messages and inquiry requests.",
    },
    booking_system: {
      label: "Instant Room Booking & Mess Subscriptions",
      desc: "Controls checkout dialogs, deposit payments, and online subscription scheduling.",
    },
    reviews: {
      label: "User Reviews & Ratings System",
      desc: "Enables star rating submissions and user review cards on listing detail pages.",
    },
    location_gps: {
      label: "Live GPS & Reverse Geocoding Pinning",
      desc: "Allows owners and admins to mark exact latitude/longitude coordinates via device GPS.",
    },
    maintenance_banner: {
      label: "Global Maintenance System Alert",
      desc: "Displays a sitewide scheduled maintenance ribbon to active visitors.",
    },
  };

  return (
    <div className="space-y-8 text-left">
      {/* Item 3: Third-Party API Status Panel */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-foreground">Third-Party API Status Panel</h2>
              <p className="text-xs text-muted-foreground">
                Monitors configuration presence and connection health for external APIs
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={runAllTests}
            disabled={testingAll}
            className="gap-2 text-xs border-border/60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingAll ? "animate-spin text-primary" : ""}`} />
            Test All API Connections
          </Button>
        </div>

        {/* Services List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => {
            const isTesting = service.status === "testing";
            const isOnline = service.status === "online";
            const isNotConfigured = service.status === "not_configured" || !service.isConfigured;

            return (
              <div
                key={service.id}
                className="bg-muted/20 border border-border/40 rounded-xl p-4 space-y-3 relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {service.category}
                    </span>

                    {isTesting ? (
                      <Badge variant="outline" className="text-[10px] gap-1 animate-pulse border-amber-500/40 text-amber-500">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Testing...
                      </Badge>
                    ) : isOnline ? (
                      <Badge className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Online
                      </Badge>
                    ) : isNotConfigured ? (
                      <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-500">
                        <AlertTriangle className="w-2.5 h-2.5" /> Missing Keys
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <XCircle className="w-2.5 h-2.5" /> Offline
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm text-foreground">{service.name}</h3>

                  {/* Env Vars status */}
                  <div className="mt-2 space-y-1">
                    {service.envVars.map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <code className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded">
                          {v.name}
                        </code>
                        <span className={v.valuePresent ? "text-emerald-500 font-medium" : "text-amber-500 font-medium"}>
                          {v.valuePresent ? "Configured ✓" : "Not Set ❌"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/30 mt-3 flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    {service.responseTimeMs !== undefined && (
                      <span className="text-foreground font-mono font-medium flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" /> {service.responseTimeMs} ms
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => runSingleTest(service.id)}
                    disabled={isTesting}
                    className="h-7 text-xs px-2.5 hover:bg-muted"
                  >
                    Test Connection
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Item 2: Feature Flags Panel */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-foreground">Platform Feature Flags Control Panel</h2>
              <p className="text-xs text-muted-foreground">
                Persisted in Postgres <code className="font-mono text-primary">platform_settings.feature_flags</code> (JSONB)
              </p>
            </div>
          </div>

          <Badge variant="outline" className="gap-1.5 text-xs py-1 border-emerald-500/30 text-emerald-500">
            <ShieldCheck className="w-3.5 h-3.5" /> Synchronized with DB
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(flagDescriptions) as (keyof FeatureFlags)[]).map((key) => {
            const isEnabled = Boolean(flags[key]);
            const info = flagDescriptions[key];
            const isSaving = savingFlag === key;

            return (
              <div
                key={key}
                className={`p-4 rounded-xl border transition-all ${
                  isEnabled
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : "bg-muted/20 border-border/40"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{info.label}</span>
                      <code className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {key}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{info.desc}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleFlag(key, checked)}
                      disabled={isSaving || loadingFlags}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
