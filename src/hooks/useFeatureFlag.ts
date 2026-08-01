import { useState, useEffect } from "react";
import { FeatureFlags, getFeatureFlags, defaultFeatureFlags } from "@/services/featureFlagsService";

export const useFeatureFlag = (flagName: keyof FeatureFlags): boolean => {
  const [isEnabled, setIsEnabled] = useState<boolean>(
    defaultFeatureFlags[flagName] ?? true
  );

  useEffect(() => {
    let isMounted = true;
    getFeatureFlags().then((flags) => {
      if (isMounted) {
        setIsEnabled(flags[flagName] ?? true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [flagName]);

  return isEnabled;
};

export const useAllFeatureFlags = () => {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const data = await getFeatureFlags();
    setFlags(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return { flags, loading, refresh };
};
